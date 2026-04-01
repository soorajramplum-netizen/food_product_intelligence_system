import flavorsData from '../../data/flavors.json'
import productsData from '../../data/products.json'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  const { query } = req.body
  if (!query) return res.status(400).json({error:'query required'})

  const flavorContext = flavorsData.slice(0,100).map(f=>`${f.name}(${f.type},${f.profile},${f.intensity})`).join('; ')
  const productContext = productsData.filter(p=>p.tier==='south_famous'||p.tier==='south_hyperregional').slice(0,80).map(p=>`${p.name}(${p.primaryState},${p.positioningRange})`).join('; ')

  const prompt = `You are South India's flavor intelligence engine. You know every flavor, ingredient, and South Indian food product.

FLAVOR LIBRARY (sample): ${flavorContext}

PRODUCT LIBRARY (sample): ${productContext}

QUERY: ${query}

Return ONLY valid JSON (no markdown) with this structure:
{
  "pairings": [
    {
      "flavorName": "string",
      "flavorType": "south_indian|generic|western|food_based",
      "why": "string (2-3 sentences on why this pairing works — flavor science + cultural logic)",
      "products": [
        {"product": "string (specific Sweet Karam Coffee product name)", "angle": "string (how to use this flavor in this product)"},
        {"product": "string", "angle": "string"}
      ]
    }
  ],
  "notes": "string (2-3 sentences on the overall pattern or key insight from these pairings)"
}`

  try {
    let text = await callAI(prompt)
    text = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
    const result = JSON.parse(text)
    res.status(200).json(result)
  } catch(err) {
    res.status(500).json({error:'Flavor pairing failed', details: err.message})
  }
}
