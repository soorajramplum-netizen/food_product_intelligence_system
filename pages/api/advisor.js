const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAdyDVmEuqASsI1HVBTdBwRB8R0-mr1Euc'
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODELS = [
  // Tier 1: Frontier (smartest, strictest quota)
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  // Tier 2: Balanced workhorses
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  // Tier 3: Safety nets (highest free quota)
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash-lite',
]

async function callGemini(prompt) {
  for (const model of GEMINI_MODELS) {
    try {
      const url = `${BASE}/${model}:generateContent?key=${GEMINI_KEY}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          contents: [{parts: [{text: prompt}]}],
          generationConfig: {temperature: 0.7, maxOutputTokens: 4000}
        })
      })
      const data = await res.json()
      if (data.error) { console.log(`Model ${model} failed:`, data.error.message); continue }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!text) { console.log(`Model ${model} returned empty`); continue }
      console.log(`Model ${model} succeeded`)
      return text
    } catch(e) { console.log(`Model ${model} threw:`, e.message); continue }
  }
  throw new Error('All Gemini models failed. Check API key quota at aistudio.google.com')
}

const MODE_CONTEXTS = {
  launch: {
    persona: "You are South India's sharpest product launch strategist. You live at the intersection of behavioral science, cultural intelligence, and NPD (New Product Development). You know every South Indian product, flavor, and occasion intimately.",
    task: "Generate specific, actionable South Indian product launch ideas. For each idea: name it, describe it, give the behavioral science hook, identify the Fluent Innovation score (how familiar it will feel to mass consumers), and explain the launch angle.",
    format: "Use headers, be specific with product names and occasions. No generic advice. Every recommendation should be something Sweet Karam Coffee could actually make and sell."
  },
  positioning: {
    persona: "You are a strategic positioning expert who specializes in South Indian food brands. You understand the Fluent Innovation principle (80% familiar + 20% new = mass adoption) and know when to lead with the familiar anchor vs. the new element.",
    task: "Give specific positioning strategy for the product or brief. Include: brand ladder placement (Daily Rituals / Healthier Treats / Artisanal Signatures / Inspired Treasures), target audience, key message, and the familiar anchor to use.",
    format: "Be direct and specific. Give the strategy first, rationale second. Include competitor differentiation."
  },
  functional: {
    persona: "You are a functional food claims specialist who deeply understands FSSAI regulations and South Indian ingredient science. You know the Ayurvedic history of every South Indian ingredient.",
    task: "Identify the strongest, most defensible functional claims for the product. Map each claim to an ingredient with evidence. Flag any FSSAI compliance issues. Format claims as packaging-ready badge text.",
    format: "Lead with the strongest claim. Give badge text for each. Be specific about evidence sources (Ayurvedic documentation, modern nutrition science, or both)."
  },
  storytelling: {
    persona: "You are an editorial writer who grew up in Tamil Nadu and now writes for premium South Indian food brands. Your copy is specific, sensory, and never generic. You know the difference between authentic and aspirational.",
    task: "Write compelling brand copy, packaging text, or brand narratives for South Indian food products. Use specific cultural references, specific locations, specific rituals. Never use generic 'tradition' or 'heritage' language without specifics.",
    format: "Write in the format requested (packaging copy, brand narrative, social copy, etc). Give 2-3 versions with different angles where appropriate."
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  const { query, mode } = req.body
  if (!query || !mode) return res.status(400).json({error:'query and mode required'})

  const ctx = MODE_CONTEXTS[mode] || MODE_CONTEXTS.launch
  const prompt = `${ctx.persona}

TASK: ${ctx.task}

FORMAT GUIDANCE: ${ctx.format}

Sweet Karam Coffee context:
- Premium D2C South Indian food brand
- Products: snacks, sweets, food items, beverages/milk mixes
- Brand ranges: Daily Rituals Series (everyday), Healthier Treats (functional), Artisanal Signatures (craft/heritage), Inspired Treasures (innovation/fusion)
- Target: Urban South Indian consumers (Chennai, Bangalore, Hyderabad, Mumbai, Delhi), 25-45, culturally rooted but open to innovation
- Fluent Innovation principle: 80% familiar + 20% new = mass adoption sweet spot

USER QUERY: ${query}

Respond with well-formatted, specific, actionable advice. Use headers and bullet points where appropriate. Be opinionated — give a clear recommendation, not a list of options.`

  try {
    const r = await fetch(GEMINI_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contents: [{parts:[{text:prompt}]}],
        generationConfig: {temperature:0.8, maxOutputTokens:2000}
      })
    })
    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.status(200).json({response: text, mode})
  } catch(err) {
    res.status(500).json({error:'Advisor failed', details: err.message})
  }
}
