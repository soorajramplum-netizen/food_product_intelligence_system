import flavorsData from '../../data/flavors.json'
import productsData from '../../data/products.json'

const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAdyDVmEuqASsI1HVBTdBwRB8R0-mr1Euc'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

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
    const r = await fetch(GEMINI_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contents: [{parts:[{text:prompt}]}],
        generationConfig: {temperature:0.7, maxOutputTokens:1500}
      })
    })
    const data = await r.json()
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    text = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
    const result = JSON.parse(text)
    res.status(200).json(result)
  } catch(err) {
    res.status(500).json({error:'Flavor pairing failed', details: err.message})
  }
}
