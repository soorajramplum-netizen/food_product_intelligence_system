const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAdyDVmEuqASsI1HVBTdBwRB8R0-mr1Euc'
const GROQ_KEY = process.env.GROQ_API_KEY || ''
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const GEMINI_MODELS = [
  'gemini-3.1-pro-preview','gemini-2.5-pro',
  'gemini-3-flash-preview','gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview','gemini-2.5-flash-lite',
]
const GROQ_MODELS = [
  'llama-3.3-70b-versatile','llama-3.1-70b-versatile',
  'mixtral-8x7b-32768','llama3-70b-8192','gemma2-9b-it',
]
const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mixtral-8x7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free',
]

async function callAI(prompt) {
  // Tier 1: Gemini
  for (const model of GEMINI_MODELS) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`
      const res = await fetch(url, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.7,maxOutputTokens:4000}})
      })
      const d = await res.json()
      if (d.error) { console.log('Gemini',model,'failed:',d.error.message); continue }
      const text = d?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!text) continue
      console.log('Gemini',model,'succeeded')
      return text
    } catch(e) { continue }
  }

  // Tier 2: Groq
  if (GROQ_KEY) {
    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_KEY}`},
          body: JSON.stringify({model, messages:[{role:'user',content:prompt}], temperature:0.7, max_tokens:4000})
        })
        const d = await res.json()
        if (d.error) { console.log('Groq',model,'failed:',d.error.message); continue }
        const text = d?.choices?.[0]?.message?.content || ''
        if (!text) continue
        console.log('Groq',model,'succeeded')
        return text
      } catch(e) { continue }
    }
  }

  // Tier 3: OpenRouter
  if (OPENROUTER_KEY) {
    for (const model of OPENROUTER_MODELS) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENROUTER_KEY}`,'HTTP-Referer':'https://southproud.vercel.app'},
          body: JSON.stringify({model, messages:[{role:'user',content:prompt}], max_tokens:4000})
        })
        const d = await res.json()
        if (d.error) { console.log('OpenRouter',model,'failed:',d.error?.message); continue }
        const text = d?.choices?.[0]?.message?.content || ''
        if (!text) continue
        console.log('OpenRouter',model,'succeeded')
        return text
      } catch(e) { continue }
    }
  }

  throw new Error('All AI providers failed (Gemini, Groq, OpenRouter). Check API keys and quota.')
}

const MODE_CONTEXTS = {
  launch: {
    persona: "You are South India's sharpest product launch strategist. You live at the intersection of behavioral science, cultural intelligence, and NPD. You know every South Indian packaged product, flavor, and occasion intimately. CRITICAL: Only recommend products that can be PACKAGED and are SHELF-LIFE STABLE — no fresh, refrigerated, or made-to-order items.",
    task: "Generate specific, actionable South Indian product launch ideas for packaged, shelf-stable products. For each: name it, describe it, give the behavioral science hook, Fluent Innovation score, and launch angle.",
    format: "Use headers. Be specific with product names and occasions. Every recommendation must be something that can go in a sealed packet with 3-6 month shelf life."
  },
  positioning: {
    persona: "You are a strategic positioning expert for South Indian packaged food brands. You understand Fluent Innovation (80% familiar + 20% new) and know when to lead with familiar anchor vs new element.",
    task: "Give specific positioning strategy. Include: brand ladder placement, target audience, key message, familiar anchor, and packaging angle.",
    format: "Direct and specific. Strategy first, rationale second. Include shelf-stable packaging consideration."
  },
  functional: {
    persona: "You are a functional food claims specialist who understands FSSAI regulations and South Indian ingredient science. Focus only on ingredients that survive packaging and retain functional properties in shelf-stable form.",
    task: "Give functional callouts and packaging-ready claims. Only claims that are valid for a packaged, shelf-stable product.",
    format: "Lead with the claim, then the badge text, then the FSSAI-safe rationale."
  },
  storytelling: {
    persona: "You are a brand storyteller who specializes in South Indian food heritage and D2C packaging copy.",
    task: "Write packaging copy, brand story angles, and occasion hooks for the product described. Focus on what works on a physical pack or D2C product page.",
    format: "Give 3 copy angles: (1) Heritage/provenance, (2) Functional/modern, (3) Occasion/gifting. Each under 40 words."
  },
  boardroom: {
    persona: "You are a senior strategy consultant presenting to the CEO and CMO of a premium South Indian packaged snacks and sweets brand.",
    task: "Generate a concise, high-impact boardroom briefing on the product portfolio and launch strategy. Focus only on products that can be packaged and shelf-stable.",
    format: "Use the exact structure provided. Be direct, specific, and opinionated."
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  const { query, mode, brandContext, refinePrompt } = req.body
  if (!query || !mode) return res.status(400).json({error:'query and mode required'})

  const ctx = MODE_CONTEXTS[mode] || MODE_CONTEXTS.launch

  const brandSection = brandContext
    ? `\nBRAND WEBSITE CONTEXT:\n${brandContext.slice(0, 2000)}\n`
    : `\nBrand: Sweet Karam Coffee — premium D2C South Indian packaged snacks and sweets.\n`

  const refineSection = refinePrompt
    ? `\nREFINEMENT REQUEST FROM USER: ${refinePrompt}\nPlease adjust your response based on this specific refinement.\n`
    : ''

  const prompt = `${ctx.persona}

TASK: ${ctx.task}

FORMAT GUIDANCE: ${ctx.format}
${brandSection}
Brand ranges: Daily Rituals Series (everyday affordable), Healthier Treats (functional), Artisanal Signatures (craft/heritage), Inspired Treasures (innovation/fusion/gifting)
Target: Urban South Indian consumers, 25-45, culturally rooted, open to innovation
Packaging constraint: ALL recommendations must be shelf-stable packaged products (3-6 month shelf life minimum)
Fluent Innovation: 80% familiar + 20% new = mass adoption sweet spot
${refineSection}
USER QUERY: ${query}

Respond with well-formatted, specific, actionable advice. Be opinionated. Every recommendation must be a product that can be sealed, packaged, and sold on a shelf or D2C.`

  try {
    const text = await callAI(prompt)
    res.status(200).json({response: text, mode})
  } catch(err) {
    res.status(500).json({error:'Advisor failed', details: err.message})
  }
}
