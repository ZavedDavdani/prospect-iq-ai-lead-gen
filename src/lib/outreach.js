import { callGemini, parseJsonResponse } from '@/lib/gemini'

const TONES = ['professional', 'casual', 'direct', 'warm']

export async function generateOutreach(lead, project, tone = 'professional') {
  const enrichment = lead.enrichment_data
  const hasRealSignal = enrichment && !enrichment.isMock

  const prompt = `You are writing first-touch cold outreach for a sales rep, personalized to a specific lead.

ICP context (why we're reaching out):
- Industry: ${project.icp_industry || 'Not specified'}
- Target Role: ${project.icp_role || 'Not specified'}
- Region: ${project.icp_region || 'Not specified'}

Lead details:
- Name: ${lead.name}
- Company: ${lead.company || 'Unknown'}
- Role: ${lead.role || 'Unknown'}

Real enrichment signal available:
${hasRealSignal ? JSON.stringify(enrichment, null, 2) : 'None — no verified enrichment data exists for this lead.'}

Tone: ${tone}

Instructions:
- Reference something SPECIFIC and REAL about this lead — their actual role, actual company, or an actual enrichment signal (industry, email pattern, verified status, etc).
- NEVER write a generic "Hi [Name], I noticed your company..." template with no real substance behind it.
- If there is genuinely no real signal available beyond name/company/role, personalize using only what IS known (their role and company name specifically) rather than inventing a fake signal — do not pretend to know something you don't.
- Write both an email (subject + body) and a shorter LinkedIn connection/outreach message.
- Keep the email body under 150 words. Keep the LinkedIn message under 80 words.
- Match the requested tone: ${tone}.
- End the email with a soft, low-pressure call to action (e.g. asking for a quick reply or a short call), not a hard sell.

Respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{
  "emailSubject": "<subject line>",
  "emailBody": "<email body>",
  "linkedinMessage": "<linkedin message>"
}`

  try {
    const responseText = await callGemini(prompt)
    const parsed = parseJsonResponse(responseText)

    if (!parsed.emailSubject || !parsed.emailBody || !parsed.linkedinMessage) {
      throw new Error('Unexpected response shape from Gemini')
    }

    return parsed
  } catch (error) {
    throw new Error('Failed to generate outreach: ' + error.message)
  }
}

export async function rewriteOutreachText(text, action, targetTone = null) {
  let instruction

  if (action === 'shorten') {
    instruction = 'Shorten this text while keeping the core message and any specific personalization intact. Aim for roughly 60-70% of the original length.'
  } else if (action === 'expand') {
    instruction = 'Expand this text slightly with more detail or context, while keeping it natural and not padded with filler.'
  } else if (action === 'tone') {
    instruction = `Rewrite this text in a ${targetTone} tone, keeping the same core message, personalization, and call to action.`
  } else {
    throw new Error('Unknown rewrite action')
  }

  const prompt = `You are editing a piece of sales outreach copy.

Original text:
"""
${text}
"""

Instruction: ${instruction}

Keep any specific personalization (names, company references, real details) intact — do not genericize it.

Respond with ONLY the rewritten text, no quotes, no markdown, no explanation.`

  const responseText = await callGemini(prompt)
  return responseText.trim()
}

export { TONES }