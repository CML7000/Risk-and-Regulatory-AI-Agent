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

const TRUSTED_DOMAINS = [
  'cms.gov', 'cdc.gov', 'hhs.gov', 'osha.gov', 'nih.gov', 'ahrq.gov', 'medicare.gov',
  'jointcommission.org', 'ashp.org', 'aha.org', 'aanp.org', 'acog.org', 'ama-assn.org',
  'nursingworld.org', 'ismp.org', 'nccmerp.org', 'ihi.org', 'psnet.ahrq.gov',
];

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const trusted = TRUSTED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
    return trusted ? url : null;
  } catch {
    return null;
  }
}

const app = express();
const port = 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
}));
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

// Support both standard API keys (ANTHROPIC_API_KEY) and OAuth tokens (ANTHROPIC_AUTH_TOKEN)
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const authToken = process.env.ANTHROPIC_AUTH_TOKEN || '';
const anthropic = new Anthropic({
  ...(apiKey && { apiKey }),
  ...(authToken && { authToken }),
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

Your audience is hospital compliance and risk staff who may have NO clinical background. Write all descriptions in plain, everyday English — avoid medical jargon. When you must use a clinical term, briefly define it in parentheses.

For every checklist item you MUST include an "emrLocation" object that tells a non-clinical compliance reviewer exactly where to find the relevant information inside common hospital EMR systems (Epic, Cerner, Meditech, or generic terms). Write the steps as if explaining to someone opening the EMR for the first time. Be specific: name the tab, module, or screen. The "whatToLookFor" field should describe what a correct, compliant record looks like versus a non-compliant one, in plain language.

Always return valid JSON matching the exact schema requested.`;

function buildUserPrompt(documentText) {
  const wasTruncated = documentText.length > 50000;
  const truncated = wasTruncated ? documentText.slice(0, 50000) + '\n\n[Document truncated for analysis]' : documentText;
  // wasTruncated is exported alongside the result so the UI can warn the user
  buildUserPrompt._wasTruncated = wasTruncated;

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
      "title": "Checklist item title — written in plain language a non-clinical person can understand",
      "description": "Plain-language explanation of what needs to be verified and why it matters for compliance. No medical jargon. If a clinical term is unavoidable, define it in parentheses.",
      "priority": "Critical|High|Medium|Low",
      "category": "Category name (e.g., Documentation, Training, Process, Technology, Governance)",
      "emrLocation": {
        "section": "Short label for where this lives in the EMR (e.g., 'Patient Chart → Consent Forms tab')",
        "steps": [
          "Step 1: Open the patient chart and click the [Tab Name] tab",
          "Step 2: Look for the [Record/Form Name] entry",
          "Step 3: ..."
        ],
        "whatToLookFor": "Plain-language description of what a COMPLIANT record looks like (e.g., 'The consent form should be signed and dated before the procedure date. If the signature is missing or the date is after the procedure, this is a compliance issue.')"
      }
    }
  ],
  "gaps": [
    {
      "id": "gap-1",
      "title": "Short title describing what is missing or inadequate in the policy",
      "description": "Plain-language explanation of the gap — what the policy currently says (or fails to say), and specifically what is missing compared to the industry standard. Written so a non-clinical compliance professional can understand it.",
      "impact": "Explain in plain language what could go wrong — for the patient, the hospital, or from a regulatory standpoint — if this gap is not addressed.",
      "recommendation": "Specific, actionable language the hospital should add or change in the policy to close this gap.",
      "severity": "Critical|High|Medium|Low",
      "sources": [
        {
          "organization": "Name of the authoritative body (e.g., CMS, CDC, The Joint Commission, ASHP, OSHA, HHS, state health department)",
          "title": "Exact name of the guidance document, regulation, or standard (e.g., 'Conditions of Participation §482.13', 'CDC Hand Hygiene Guidelines 2002', 'ASHP Guidelines on Preventing Medication Errors')",
          "type": "Regulation|Guidance|Standard|Best Practice|Law",
          "url": "Direct URL to the authoritative source — ONLY use official government or organization websites (.gov, cms.gov, cdc.gov, jointcommission.org, ashp.org, osha.gov, hhs.gov). Do NOT fabricate URLs."
        }
      ]
    }
  ]
}

Requirements:
- summary: 2-3 substantive paragraphs
- highlights: exactly 5-8 bullet points covering the most important policy elements
- frameworks: identify ALL relevant regulatory frameworks (HIPAA, Joint Commission, CMS, state regulations, OSHA, etc.)
- riskAreas: identify 3-6 specific compliance risk areas with severity ratings
- checklist: 8-12 actionable compliance items with priority ratings; every item MUST include a populated "emrLocation" object with realistic, specific navigation steps for common hospital EMR systems
- gaps: identify 4-8 specific gaps between the uploaded policy and current industry best practices. For EACH gap you MUST cite at least one authoritative source from CMS, CDC, The Joint Commission, ASHP, OSHA, HHS, or recognized healthcare law/regulatory bodies. Only cite sources that genuinely apply to this policy's subject matter. Every URL must be a real, known URL from an official organization website — if you are not certain of the exact URL, omit the url field rather than guessing.
- All text must be written for a non-clinical compliance audience — no unexplained medical jargon

Document to analyze:

${truncated}

Return ONLY the JSON object with no additional text, markdown formatting, or explanation.`;
}

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!apiKey && !authToken) {
      return res.status(500).json({ error: 'No Anthropic credentials configured. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in .env' });
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
            emrLocation: item.emrLocation || null,
          }))
        : [],
      gaps: Array.isArray(analysisData.gaps)
        ? analysisData.gaps.map((gap, idx) => ({
            id: gap.id || `gap-${idx}`,
            title: gap.title || 'Untitled Gap',
            description: gap.description || '',
            impact: gap.impact || '',
            recommendation: gap.recommendation || '',
            severity: ['Critical', 'High', 'Medium', 'Low'].includes(gap.severity) ? gap.severity : 'Medium',
            sources: Array.isArray(gap.sources) ? gap.sources.map(s => ({
              organization: s.organization || '',
              title: s.title || '',
              type: s.type || 'Guidance',
              url: sanitizeUrl(s.url),
            })) : [],
          }))
        : [],
      truncated: buildUserPrompt._wasTruncated || false,
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
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn('WARNING: No Anthropic credentials set. Add ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN to .env');
  }
});
