import { callGemini, parseJsonResponse } from '@/lib/gemini'

export async function scoreLead(lead, project) {
  const enrichment = lead.enrichment_data

  const prompt = `You are scoring a sales lead against an Ideal Customer Profile (ICP) for outreach prioritization.

ICP (what we're looking for):
- Industry: ${project.icp_industry || 'Not specified'}
- Company Size: ${project.icp_company_size || 'Not specified'}
- Target Role: ${project.icp_role || 'Not specified'}
- Region: ${project.icp_region || 'Not specified'}

Lead details:
- Name: ${lead.name}
- Company: ${lead.company || 'Unknown'}
- Role: ${lead.role || 'Unknown'}
- Domain: ${lead.domain || 'Not provided'}

Enrichment data (if available):
${enrichment && !enrichment.isMock ? JSON.stringify(enrichment, null, 2) : 'No real enrichment data available — score based on the raw lead fields above only.'}

Instructions:
- Score this lead from 0-100 based on how well it matches the ICP.
- Weigh industry match, company size match, role seniority, and region match.
- If enrichment data includes intent signals (funding, hiring activity, tech stack), factor those in too.
- If fields are missing or unknown, score conservatively lower rather than guessing — treat missing data as neutral-to-low uncertainty, not zero.
- Even for a clear, confirmed mismatch (wrong industry, wrong seniority), the score must never be exactly 0 — the practical minimum is 5.
- Write a short, plain-language explanation (1-2 sentences) justifying the score.
- Additionally, classify each of these 5 criteria as one of: "match" (clearly confirmed and aligned), "mismatch" (clearly confirmed and NOT aligned), or "unknown" (no reliable data to judge it either way):
  - industryMatch
  - roleMatch
  - companySizeMatch
  - regionMatch
  - growthSignals (evidence of hiring, funding, or expansion — "unknown" if enrichment has no intent data)

Respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{
  "score": <integer 0-100>,
  "explanation": "<short explanation>",
  "criteria": {
    "industryMatch": "match" | "mismatch" | "unknown",
    "roleMatch": "match" | "mismatch" | "unknown",
    "companySizeMatch": "match" | "mismatch" | "unknown",
    "regionMatch": "match" | "mismatch" | "unknown",
    "growthSignals": "match" | "mismatch" | "unknown"
  }
}`

  try {
    const responseText = await callGemini(prompt)
    const parsed = parseJsonResponse(responseText)

    if (typeof parsed.score !== 'number' || !parsed.explanation) {
      throw new Error('Unexpected response shape from Gemini')
    }

    return {
      score: Math.max(5, Math.min(100, Math.round(parsed.score))),
      explanation: parsed.explanation,
      criteria: parsed.criteria || null,
    }
  } catch (error) {
    throw new Error('Failed to score lead: ' + error.message)
  }
}