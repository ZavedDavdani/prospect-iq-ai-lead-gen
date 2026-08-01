export const demoProject = {
  name: 'Demo: SaaS Outbound Campaign',
  icp_industry: 'B2B SaaS',
  icp_company_size: '50-200 employees',
  icp_role: 'VP of Sales / Head of Revenue',
  icp_region: 'North America',
}

export const demoLeads = [
  {
    name: 'Alex Chen',
    company: 'Stripe',
    role: 'VP of Sales',
    domain: 'stripe.com',
    email: null,
    source: 'manual',
    score: 78,
    score_explanation:
      'Strong role match (VP of Sales is a decision-maker) and industry alignment with B2B SaaS. Company size and region could not be confirmed from available data, keeping this from scoring higher.',
    enrichment_data: {
      isMock: false,
      organization: 'Stripe',
      domain: 'stripe.com',
      industry: 'Financial Technology / SaaS',
      companySize: 'Unknown',
      emailPattern: '{first}.{last}@stripe.com',
      emailCount: 12,
    },
  },
  {
    name: 'Priya Natarajan',
    company: 'Notion',
    role: 'Head of Revenue',
    domain: 'notion.so',
    email: null,
    source: 'csv',
    score: 82,
    score_explanation:
      'Excellent fit: Head of Revenue is a strong decision-maker match, Notion operates in B2B SaaS, and enrichment confirms an active, well-staffed organization consistent with the target company size range.',
    enrichment_data: {
      isMock: false,
      organization: 'Notion Labs',
      domain: 'notion.so',
      industry: 'Productivity Software / SaaS',
      companySize: '51-200',
      emailPattern: '{first}@notion.so',
      emailCount: 34,
    },
  },
  {
    name: 'Marcus Webb',
    company: "Joe's Local Plumbing",
    role: 'Owner',
    domain: null,
    email: null,
    source: 'manual',
    score: 5,
    score_explanation:
      'Clear mismatch: local plumbing is unrelated to the target B2B SaaS industry, and there is no enrichment data available to reconsider the fit.',
    enrichment_data: null,
  },
  {
    name: 'Sara Kim',
    company: 'Linear',
    role: 'Sales Development Rep',
    domain: 'linear.app',
    email: null,
    source: 'csv',
    score: 42,
    score_explanation:
      'Company fits the B2B SaaS ICP well, but the role (SDR) is not a decision-maker, which caps the score despite good industry alignment.',
    enrichment_data: {
      isMock: false,
      organization: 'Linear',
      domain: 'linear.app',
      industry: 'Software Development Tools / SaaS',
      companySize: '11-50',
      emailPattern: '{first}@linear.app',
      emailCount: 8,
    },
  },
  {
    name: 'David Okafor',
    company: 'Unknown Startup',
    role: null,
    domain: null,
    email: null,
    source: 'manual',
    score: 15,
    score_explanation:
      'Almost no information is available for this lead — role, company details, and region are all unknown, resulting in a conservative low score reflecting uncertainty rather than a confirmed mismatch.',
    enrichment_data: null,
  },
]

// Pre-written outreach only for the two highest-fit leads,
// matching a realistic workflow (you wouldn't draft outreach for every lead upfront)
export const demoOutreach = {
  'Alex Chen': {
    tone: 'professional',
    email: {
      subject: 'Quick thought on Stripe\'s outbound pipeline',
      body: `Hi Alex,

Leading sales at a company scaling as fast as Stripe means pipeline efficiency is probably always on your radar.

We work with VPs of Sales at fast-growing SaaS companies to help reps spend less time on manual prospecting and more time closing.

Would you be open to a brief call next week to see if this could be useful for your team?

Best,
[Your Name]`,
    },
    linkedin:
      "Hi Alex, noticed your role leading sales at Stripe. We help SaaS sales leaders streamline outbound pipeline generation — open to connecting?",
  },
  'Priya Natarajan': {
    tone: 'warm',
    email: {
      subject: "Notion's growth and revenue ops",
      body: `Hi Priya,

Notion's growth over the past year has been impressive to watch, and I imagine that puts real pressure on scaling revenue operations efficiently.

We help revenue leaders at fast-scaling SaaS companies streamline outbound without adding headcount.

Would love to find 15 minutes to share how we've helped similar teams — open to a quick chat?

Warmly,
[Your Name]`,
    },
    linkedin:
      "Hi Priya, really admire what Notion's building. Given your role in revenue, thought I'd reach out — we help SaaS teams scale outbound efficiently. Open to connecting?",
  },
}