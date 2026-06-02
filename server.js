import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createRequire } from 'module';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pdf-parse and mammoth are CommonJS modules; use createRequire
const require = createRequire(import.meta.url);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.txt') || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
    }
  },
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function extractText(file) {
  const { mimetype, originalname, buffer } = file;

  if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      throw new Error(`Failed to parse PDF: ${err.message}`);
    }
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalname.endsWith('.docx')
  ) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      throw new Error(`Failed to parse DOCX: ${err.message}`);
    }
  }

  throw new Error('Unsupported file type');
}

const SYSTEM_PROMPT = `You are an expert hospital compliance officer and regulatory specialist with deep knowledge of healthcare law, accreditation standards, and risk management. Analyze healthcare policy and procedure documents and provide structured compliance analysis.

Your analysis must be thorough, actionable, and focused on practical compliance steps that hospital risk and compliance teams can immediately use. Always return valid JSON matching the exact schema requested.`;

function buildUserPrompt(documentText) {
  const truncated = documentText.length > 50000 ? documentText.slice(0, 50000) + '\n\n[Document truncated for analysis]' : documentText;

  return `Analyze the following hospital policy/procedure document and return a JSON object with this exact structure:

{
  "summary": "A plain-language summary of the policy in 2-3 paragraphs. Explain what the policy covers, its purpose, and who it applies to.",
  "highlights": [
    "Key policy highlight 1",
    "Key policy highlight 2",
    "... (5-8 bullet points total)"
  ],
  "frameworks": [
    {
      "name": "Framework or regulation name",
      "relevance": "Brief explanation of how this framework applies to the policy"
    }
  ],
  "riskAreas": [
    {
      "area": "Risk area title",
      "description": "Description of the identified risk",
      "severity": "High|Medium|Low"
    }
  ],
  "checklist": [
    {
      "id": "unique-id-1",
      "title": "Checklist item title",
      "description": "Detailed description of what needs to be done",
      "priority": "Critical|High|Medium|Low",
      "category": "Category name (e.g., Documentation, Training, Process, Technology, Governance)"
    }
  ]
}

Requirements:
- summary: 2-3 substantive paragraphs
- highlights: exactly 5-8 bullet points covering the most important policy elements
- frameworks: identify ALL relevant regulatory frameworks (HIPAA, Joint Commission, CMS, state regulations, OSHA, etc.)
- riskAreas: identify 3-6 specific compliance risk areas with severity ratings
- checklist: 8-12 actionable compliance items with priority ratings

Document to analyze:

${truncated}

Return ONLY the JSON object with no additional text, markdown formatting, or explanation.`;
}

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    }

    let documentText;
    try {
      documentText = await extractText(req.file);
    } catch (err) {
      return res.status(400).json({ error: `File parsing failed: ${err.message}` });
    }

    if (!documentText || documentText.trim().length < 50) {
      return res.status(400).json({ error: 'The document appears to be empty or could not be read' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(documentText),
        },
      ],
    });

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    let analysisData;
    try {
      // Strip markdown code fences if present
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      analysisData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error. Raw response:', responseText.slice(0, 500));
      return res.status(500).json({ error: 'Failed to parse AI response as JSON. Please try again.' });
    }

    // Validate and normalize structure
    const result = {
      summary: analysisData.summary || 'No summary available.',
      highlights: Array.isArray(analysisData.highlights) ? analysisData.highlights : [],
      frameworks: Array.isArray(analysisData.frameworks) ? analysisData.frameworks : [],
      riskAreas: Array.isArray(analysisData.riskAreas) ? analysisData.riskAreas : [],
      checklist: Array.isArray(analysisData.checklist)
        ? analysisData.checklist.map((item, idx) => ({
            id: item.id || `item-${idx}`,
            title: item.title || 'Untitled Item',
            description: item.description || '',
            priority: ['Critical', 'High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Medium',
            category: item.category || 'General',
            completed: false,
          }))
        : [],
    };

    return res.json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid Anthropic API key. Please check your configuration.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }
    return res.status(500).json({ error: `Analysis failed: ${err.message || 'Unknown error'}` });
  }
});

app.listen(port, () => {
  console.log(`Hospital Policy Compliance server running on http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set. Set it in a .env file.');
  }
});
