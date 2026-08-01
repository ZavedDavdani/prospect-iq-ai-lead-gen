import { callGemini, parseJsonResponse } from '@/lib/gemini'

export async function generateInsights(project, leads) {
  if (leads.length === 0) {
    return null
  }

  const leadSummary = leads.map((l) => ({
    name: l.name,
    company: l.company,
    role: l.role,
    score: l.score,
    enriched: l.enrichment_data ? !l.enrichment_data.isMock : false,
  }))

  const prompt = `You are a sales operations analyst reviewing a list of scored leads for a campaign.

ICP: ${project.icp_industry || 'Not specified'} · ${project.icp_role || 'Not specified'} · ${project.icp_company_size || 'Not specified'} · ${project.icp_region || 'Not specified'}

Leads (${leads.length} total):
${JSON.stringify(leadSummary, null, 2)}

Instructions:
- Identify 3-5 short, sharp, genuinely useful insights a sales rep could act on immediately.
- Base every insight strictly on the data provided — do not invent facts not present in the lead list.
- Good insight types: how many leads are high-priority (score 70+), patterns in which roles/companies score best, which leads still need enrichment, which single lead has the most potential and why.
- Keep each insight under 15 words. Be specific — use real names/numbers from the data, not generic statements.

Respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{"insights": ["<insight 1>", "<insight 2>", "<insight 3>"]}`

  try {
    const responseText = await callGemini(prompt)
    const parsed = parseJsonResponse(responseText)

    if (!Array.isArray(parsed.insights)) {
      throw new Error('Unexpected response shape from Gemini')
    }

    return parsed.insights
  } catch (error) {
    throw new Error('Failed to generate insights: ' + error.message)
  }
}