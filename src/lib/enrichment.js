import axios from 'axios'

const HUNTER_API_KEY = import.meta.env.VITE_HUNTER_API_KEY
const HUNTER_BASE_URL = 'https://api.hunter.io/v2'

// Generates a plausible mock enrichment response when the real API
// is unavailable or rate-limited, clearly flagged as mock data.
function getMockEnrichment(lead) {
  return {
    isMock: true,
    organization: lead.company || 'Unknown Company',
    domain: lead.domain || (lead.company ? `${lead.company.toLowerCase().replace(/\s+/g, '')}.com` : null),
    industry: 'Unknown',
    companySize: 'Unknown',
    emailPattern: '{first}.{last}@domain.com',
    verifiedEmail: false,
  }
}

export async function enrichLead(lead) {
  // Nothing to look up — no domain or email provided
  if (!lead.domain && !lead.email) {
    return {
      isMock: true,
      reason: 'No domain or email provided for enrichment',
      organization: lead.company || 'Unknown Company',
    }
  }

  try {
    if (lead.domain) {
      const response = await axios.get(`${HUNTER_BASE_URL}/domain-search`, {
        params: {
          domain: lead.domain,
          api_key: HUNTER_API_KEY,
        },
      })

      const data = response.data.data

      return {
        isMock: false,
        organization: data.organization || lead.company,
        domain: data.domain,
        industry: data.industry || 'Unknown',
        companySize: data.company_size || 'Unknown',
        emailPattern: data.pattern || 'Unknown',
        emailCount: data.emails?.length || 0,
      }
    }

    if (lead.email) {
      const response = await axios.get(`${HUNTER_BASE_URL}/email-verifier`, {
        params: {
          email: lead.email,
          api_key: HUNTER_API_KEY,
        },
      })

      const data = response.data.data

      return {
        isMock: false,
        organization: lead.company,
        verifiedEmail: data.status === 'valid',
        emailScore: data.score,
        emailStatus: data.status,
      }
    }
  } catch (error) {
    const status = error.response?.status

    // Rate limit or quota exceeded — fall back to mock
    if (status === 429 || status === 401 || status === 403) {
      return {
        ...getMockEnrichment(lead),
        reason: 'Enrichment API limit reached — using fallback data',
      }
    }

    // Any other failure — still fall back gracefully rather than crashing
    return {
      ...getMockEnrichment(lead),
      reason: 'Enrichment lookup failed — using fallback data',
    }
  }
}