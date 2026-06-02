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
  'hrsa.gov',
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
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/csv',
    ];
    const allowedExts = ['.txt', '.pdf', '.docx', '.csv'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, TXT, and CSV files are allowed'));
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
  const ext = '.' + originalname.split('.').pop().toLowerCase();

  if (mimetype === 'text/plain' || ext === '.txt') {
    return buffer.toString('utf-8');
  }

  if (mimetype === 'text/csv' || mimetype === 'application/csv' || ext === '.csv') {
    return buffer.toString('utf-8');
  }

  if (mimetype === 'application/pdf' || ext === '.pdf') {
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
    ext === '.docx'
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

function truncateText(text) {
  const wasTruncated = text.length > 50000;
  const truncated = wasTruncated ? text.slice(0, 50000) + '\n\n[Document truncated for analysis]' : text;
  return { truncated, wasTruncated };
}

function checkCredentials(res) {
  if (!apiKey && !authToken) {
    res.status(500).json({ error: 'No Anthropic credentials configured. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in .env' });
    return false;
  }
  return true;
}

function handleApiError(err, res) {
  console.error('API error:', err);
  if (err.status === 401) {
    return res.status(500).json({ error: 'Invalid Anthropic API key. Please check your configuration.' });
  }
  if (err.status === 429) {
    return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
  }
  return res.status(500).json({ error: `Request failed: ${err.message || 'Unknown error'}` });
}

async function callClaude(system, userContent, maxTokens) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  return message.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

function parseJsonResponse(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// ── POST /api/summarize ──────────────────────────────────────────────────────
app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!checkCredentials(res)) return;

    let documentText;
    try {
      documentText = await extractText(req.file);
    } catch (err) {
      return res.status(400).json({ error: `File parsing failed: ${err.message}` });
    }

    if (!documentText || documentText.trim().length < 50) {
      return res.status(400).json({ error: 'The document appears to be empty or could not be read.' });
    }

    const { truncated: truncatedText, wasTruncated } = truncateText(documentText);

    const summaryText = await callClaude(
      'You are a plain-language hospital compliance expert. Describe documents clearly for non-clinical staff.',
      `In 2-3 sentences of plain English, describe what this hospital policy covers, its main purpose, and who it applies to. No jargon. Return only the summary text, no JSON, no markdown.\n\nDocument:\n${truncatedText}`,
      300
    );

    return res.json({ summary: summaryText.trim(), policyText: documentText, truncated: wasTruncated });
  } catch (err) {
    return handleApiError(err, res);
  }
});

// ── POST /api/compliance-checklist ──────────────────────────────────────────
app.post('/api/compliance-checklist', async (req, res) => {
  try {
    if (!checkCredentials(res)) return;
    const { policyText } = req.body;
    if (!policyText) return res.status(400).json({ error: 'policyText is required' });

    const { truncated } = truncateText(policyText);

    const raw = await callClaude(
      'You are an expert hospital compliance officer writing audit checklists for non-clinical compliance staff. Always return valid JSON.',
      `Generate a compliance audit checklist for the following hospital policy. Return a JSON object: { "checklist": [ ... ] }

Each checklist item must follow this exact schema:
{
  "id": "unique-id-string",
  "title": "Plain-language title a non-clinical person can understand",
  "description": "What needs to be verified and why it matters. No medical jargon. If a clinical term is unavoidable, define it in parentheses.",
  "priority": "Critical|High|Medium|Low",
  "category": "Documentation|Training|Process|Technology|Governance",
  "completed": false,
  "sourceOfTruth": {
    "system": "One of: Epic EMR | Cerner EMR | Workday | Registration System | MCR | Policy Repository | Medical Records | Credentialing System | Billing System | Other",
    "location": "Plain-language path, e.g. 'Epic -> Patient Chart -> Consent Forms tab'",
    "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "whatToLookFor": "Plain-language description of what a compliant record looks like vs. a non-compliant one"
  }
}

Requirements:
- Generate 8-12 items
- Written for a non-clinician auditor — no unexplained medical jargon
- Each item must tell the auditor EXACTLY which system to open and what screen/tab to navigate to
- System options: Epic EMR, Cerner EMR, Workday (HR/payroll/training), Registration System (patient intake), MCR (Medical Cost Report), Policy Repository (SharePoint/Intranet), Medical Records, Credentialing System, Billing System
- Return ONLY the JSON object, no markdown, no explanation

Policy document:
${truncated}`,
      4096
    );

    const data = parseJsonResponse(raw);
    const checklist = Array.isArray(data.checklist) ? data.checklist.map((item, idx) => ({
      id: item.id || `item-${idx}`,
      title: item.title || 'Untitled Item',
      description: item.description || '',
      priority: ['Critical', 'High', 'Medium', 'Low'].includes(item.priority) ? item.priority : 'Medium',
      category: item.category || 'General',
      completed: false,
      sourceOfTruth: item.sourceOfTruth || null,
    })) : [];

    return res.json({ checklist });
  } catch (err) {
    return handleApiError(err, res);
  }
});

// ── POST /api/gaps ───────────────────────────────────────────────────────────
app.post('/api/gaps', async (req, res) => {
  try {
    if (!checkCredentials(res)) return;
    const { policyText } = req.body;
    if (!policyText) return res.status(400).json({ error: 'policyText is required' });

    const { truncated } = truncateText(policyText);

    const raw = await callClaude(
      'You are a hospital compliance expert specializing in regulatory gap analysis. Always return valid JSON.',
      `Analyze the following hospital policy against industry best practices and regulatory standards. Return a JSON object: { "gaps": [ ... ] }

Each gap must follow this schema:
{
  "id": "gap-N",
  "title": "Short title of what is missing or inadequate",
  "description": "Plain-language explanation of the gap — what the policy currently says (or fails to say) and what is missing.",
  "impact": "Plain-language explanation of what could go wrong if this gap is not addressed.",
  "recommendation": "Specific, actionable language the hospital should add or change to close this gap.",
  "severity": "Critical|High|Medium|Low",
  "sources": [
    {
      "organization": "CMS | CDC | HRSA | HHS | OSHA | Joint Commission | State DOH | Other official body",
      "title": "Exact name of the guidance document or regulation",
      "type": "Regulation|Guidance|Standard|Best Practice|Law",
      "url": "Direct URL — ONLY use cms.gov, cdc.gov, hrsa.gov, hhs.gov, jointcommission.org, osha.gov, or official state/regulatory sites. Omit if uncertain."
    }
  ]
}

Requirements:
- Identify 4-8 specific gaps
- Cite ONLY CMS, CDC, HRSA, HHS, OSHA, Joint Commission, state DOH, or official regulatory bodies
- Compare against peer hospital best practices
- All text written for a non-clinical compliance audience
- Return ONLY the JSON object, no markdown, no explanation

Policy document:
${truncated}`,
      4096
    );

    const data = parseJsonResponse(raw);
    const gaps = Array.isArray(data.gaps) ? data.gaps.map((gap, idx) => ({
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
    })) : [];

    return res.json({ gaps });
  } catch (err) {
    return handleApiError(err, res);
  }
});

// ── POST /api/fill-matrix ────────────────────────────────────────────────────
app.post('/api/fill-matrix', upload.fields([{ name: 'matrixFile', maxCount: 1 }]), async (req, res) => {
  try {
    if (!checkCredentials(res)) return;
    const files = req.files;
    if (!files || !files.matrixFile || !files.matrixFile[0]) {
      return res.status(400).json({ error: 'matrixFile is required' });
    }
    const { policyText } = req.body;
    if (!policyText) return res.status(400).json({ error: 'policyText is required' });

    let matrixText;
    try {
      matrixText = await extractText(files.matrixFile[0]);
    } catch (err) {
      return res.status(400).json({ error: `Matrix file parsing failed: ${err.message}` });
    }

    const { truncated: truncatedPolicy } = truncateText(policyText);

    const raw = await callClaude(
      'You are a hospital compliance expert filling out risk matrices. Always return valid JSON.',
      `You have a hospital policy document and a risk matrix template. Fill in the risk matrix based on the policy content.

Return a JSON object:
{
  "filledMatrix": {
    "headers": ["Column 1", "Column 2", ...],
    "rows": [
      {
        "cells": ["value1", "value2", ...],
        "risk": "Risk description",
        "likelihood": "High|Medium|Low",
        "impact": "High|Medium|Low",
        "mitigation": "Mitigation strategy"
      }
    ]
  },
  "rawText": "If the matrix structure is unclear, put the filled content here as plain text"
}

If the template has clear headers/columns, populate rows for each identifiable risk in the policy.
If the template structure is unclear, fill rawText with a structured plain-text response.
Return ONLY the JSON object.

POLICY DOCUMENT:
${truncatedPolicy}

MATRIX TEMPLATE:
${matrixText.slice(0, 10000)}`,
      4096
    );

    const data = parseJsonResponse(raw);
    return res.json({
      filledMatrix: data.filledMatrix || { headers: [], rows: [] },
      rawText: data.rawText || '',
    });
  } catch (err) {
    return handleApiError(err, res);
  }
});

// ── POST /api/compare-versions ───────────────────────────────────────────────
app.post('/api/compare-versions', upload.array('version', 5), async (req, res) => {
  try {
    if (!checkCredentials(res)) return;
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 version files are required' });
    }

    const versionTexts = [];
    for (const file of req.files) {
      try {
        const text = await extractText(file);
        versionTexts.push({ name: file.originalname, text });
      } catch (err) {
        return res.status(400).json({ error: `Failed to parse ${file.originalname}: ${err.message}` });
      }
    }

    const versionsBlock = versionTexts.map((v, i) =>
      `=== VERSION ${i + 1}: ${v.name} ===\n${v.text.slice(0, 15000)}`
    ).join('\n\n');

    const raw = await callClaude(
      'You are a hospital compliance expert specializing in policy version comparison. Always return valid JSON.',
      `Compare these ${versionTexts.length} versions of a hospital policy and identify all material changes.

Return a JSON object:
{
  "versionCount": ${versionTexts.length},
  "summary": "Plain-language overall summary of the most important changes across all versions",
  "changes": [
    {
      "section": "Section name or topic area",
      "type": "Added|Removed|Modified|Risk Introduced|Risk Removed",
      "before": "Previous language, or null if new",
      "after": "New language, or null if removed",
      "riskLevel": "Critical|High|Medium|Low|None",
      "explanation": "Plain-language explanation of what changed and why it matters for compliance"
    }
  ]
}

Requirements:
- Identify ALL material changes between versions
- Focus on compliance implications
- Plain language throughout
- Return ONLY the JSON object

${versionsBlock}`,
      4096
    );

    const data = parseJsonResponse(raw);
    return res.json({
      versionCount: data.versionCount || versionTexts.length,
      summary: data.summary || '',
      changes: Array.isArray(data.changes) ? data.changes : [],
    });
  } catch (err) {
    return handleApiError(err, res);
  }
});

// ── POST /api/ask ────────────────────────────────────────────────────────────
app.post('/api/ask', async (req, res) => {
  try {
    if (!checkCredentials(res)) return;
    const { policyText, question } = req.body;
    if (!policyText) return res.status(400).json({ error: 'policyText is required' });
    if (!question) return res.status(400).json({ error: 'question is required' });

    const { truncated } = truncateText(policyText);

    const raw = await callClaude(
      'You are a hospital compliance expert answering questions about policy documents. Always return valid JSON.',
      `Answer the following question about this hospital policy. If the question cannot be answered from the policy text, say so clearly.

Return a JSON object:
{
  "answer": "Plain-language answer to the question",
  "citations": [
    {
      "quote": "Exact quote from the policy that supports the answer",
      "context": "Brief explanation of how this quote supports the answer"
    }
  ]
}

- If the question cannot be answered from the policy, set answer to a clear explanation and citations to []
- Keep the answer concise and in plain language
- Return ONLY the JSON object

QUESTION: ${question}

POLICY DOCUMENT:
${truncated}`,
      1024
    );

    const data = parseJsonResponse(raw);
    return res.json({
      answer: data.answer || 'No answer available.',
      citations: Array.isArray(data.citations) ? data.citations : [],
    });
  } catch (err) {
    return handleApiError(err, res);
  }
});

app.listen(port, () => {
  console.log(`Hospital Policy Compliance server running on http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn('WARNING: No Anthropic credentials set. Add ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN to .env');
  }
});
