import productsData from '../../data/products.json'
import fs from 'fs'
import path from 'path'

const GEMINI_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAdyDVmEuqASsI1HVBTdBwRB8R0-mr1Euc'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_KEY}`

// Fluent Innovation bands
const FLUENT_BANDS = [
  { min: 85, label: 'Mass Category', desc: 'Already mainstream nationally — needs differentiation, not education' },
  { min: 70, label: 'Sweet Spot', desc: '80/20 zone — ideal for national launch, familiar enough to adopt instantly' },
  { min: 55, label: 'Bridge Required', desc: 'Moderately known — needs a familiar anchor or comparison to cross over' },
  { min: 40, label: 'Regional Champion', desc: 'Strong in home state, needs a bridge story for national market' },
  { min: 25, label: 'Cultural Discovery', desc: 'Niche — needs storytelling investment and community seeding' },
  { min: 0,  label: 'Hidden Gem', desc: 'Hyperlocal — requires significant market education to go national' },
]

function getFluentBand(score) {
  for (const b of FLUENT_BANDS) {
    if (score >= b.min) return b
  }
  return FLUENT_BANDS[FLUENT_BANDS.length - 1]
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i===0?j:j===0?i:0))
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j-1],dp[i-1][j],dp[i][j-1])
  return dp[m][n]
}

function findProduct(name) {
  const q = name.toLowerCase().trim()
  let best = null, bestScore = Infinity
  for (const p of productsData) {
    const candidates = [p.name, ...(p.aliases||[])].map(s=>s.toLowerCase())
    for (const c of candidates) {
      if (c === q) return p
      const d = levenshtein(q, c)
      if (d < bestScore && d <= 3) { bestScore = d; best = p }
    }
  }
  return best
}

function loadCache(productId) {
  try {
    const fp = path.join(process.cwd(),'data','cache',`${productId}.json`)
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp,'utf8'))
  } catch {}
  return null
}

const BEHAVIORAL_SCIENCE = `
SHOTTON 25 BIASES: (1)Fundamental Attribution Error (2)Social Proof (3)Negative Social Proof Flip (4)Distinctiveness/Von Restorff (5)Habit (6)Pain of Payment (7)Danger of Claimed Data (8)Mood (9)Price Relativity (10)Primacy Effect (11)Expectancy Theory (12)Confirmation Bias (13)Overconfidence (14)Wishful Seeing (15)Media Context (16)Curse of Knowledge (17)Goodhart's Law (18)Pratfall Effect (19)Winner's Curse (20)Power of Group (21)Veblen Goods (22)Replicability Crisis (23)Variability (24)Cocktail Party Effect (25)Scarcity

SUTHERLAND ALCHEMY PRINCIPLES: S1:Psycho-Logic S2:Effort Heuristic S3:Geographical Provenance S4:Reframing S5:Loss Aversion S6:Signal Theory S7:Placebo Effect as Design S8:Satisficing S9:Affordance/Less-is-More S10:Exclusive Framing

FLUENT INNOVATION (80% Familiar + 20% New): The sweet spot for mass adoption. Too familiar = contempt. Too new = rejection. Uber succeeded by using familiar hitch-hiking behavior (80%) with just the app as new (20%). Every product needs a Familiarity Score: how well-known is this to the urban pan-India mass consumer?
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})

  const { productName, category, ingredients } = req.body
  if (!productName) return res.status(400).json({error:'productName required'})

  const dbProduct = findProduct(productName)

  // Try cache first
  if (dbProduct) {
    const cached = loadCache(dbProduct.id)
    if (cached) return res.status(200).json({...cached, _source:'cache'})
  }

  // Build familiarity meter data
  const fs = dbProduct?.familiarityScore || 50
  const band = getFluentBand(fs)

  // Generate via Gemini
  const ingredientInfo = ingredients ? `\nIngredients provided: ${ingredients}` : ''
  const dbContext = dbProduct ? `
DATABASE MATCH: ${JSON.stringify({
  name: dbProduct.name,
  tier: dbProduct.tier,
  southIndianStatus: dbProduct.southIndianStatus,
  primaryState: dbProduct.primaryState,
  region: dbProduct.region,
  positioningRange: dbProduct.positioningRange,
  productLed: dbProduct.productLed,
  flavorLed: dbProduct.flavorLed,
  festivals: dbProduct.festivals,
  ingredients: dbProduct.ingredients,
  tags: dbProduct.tags,
  familiarityScore: dbProduct.familiarityScore,
  fluentBand: dbProduct.fluentBand,
  proxyOf: dbProduct.proxyOf,
  proxyState: dbProduct.proxyState,
  launchAngle: dbProduct.launchAngle,
})}` : ''

  const prompt = `You are Sweet Karam Coffee's product intelligence engine. Analyze this South Indian food product for launch strategy.

PRODUCT: "${productName}" (Category: ${category || 'unknown'})${ingredientInfo}
${dbContext}

${BEHAVIORAL_SCIENCE}

FLUENT INNOVATION FAMILIARITY SCORE for this product: ${fs}/100 (Band: ${band.label} — ${band.desc})
This means: when showing this product to a pan-India urban consumer, ${fs}% of it feels familiar and ${100-fs}% feels new. 
Innovation angle: leverage the ${fs}% familiar to make the ${100-fs}% new feel safe to try.

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "correctedName": "string",
  "dbMatchFound": boolean,
  "southIndianStatus": {
    "isSouthIndian": boolean,
    "verdict": "Clearly South Indian|Partially South Indian|North Indian|Western",
    "productLed": boolean,
    "flavorLed": boolean,
    "productLedExplanation": "string (2-3 sentences)",
    "flavorLedExplanation": "string (2-3 sentences)",
    "overallSummary": "string (2-3 sentences)"
  },
  "southIndianProxy": {
    "applicable": boolean,
    "proxyProduct": "string or empty",
    "proxyState": "string or empty",
    "visualSimilarity": "string",
    "launchAngle": "string",
    "suggestedName": "string"
  },
  "familiarityMeter": {
    "score": ${fs},
    "band": "${band.label}",
    "bandDescription": "${band.desc}",
    "familiarPct": ${Math.min(fs, 100)},
    "newPct": ${100 - Math.min(fs, 100)},
    "dimensions": {
      "nameRecognition": <integer 0-25: name recognition nationally — 22-25=nationally famous, 15-21=food enthusiast level, 8-14=SI diaspora only, 0-7=unknown>,
      "formatProxy": <integer 0-25: national format equivalent — 23-25=direct proxy exists, 18-22=close proxy, 12-17=loose, 5-11=vague, 0-4=none>,
      "flavorAccess": <integer 0-25: flavor familiarity to non-SI palate — 22-25=pan-India flavor, 17-21=familiar with slight twist, 12-16=mixed, 7-11=acquired taste, 0-6=very unfamiliar>,
      "visualTexture": <integer 0-25: visual/texture familiarity — 22-25=instantly recognisable format, 15-21=broadly familiar, 8-14=distinctive but interpretable, 0-7=unlike anything national>
    },
    "familiarAnchor": "What specifically feels familiar to the mass pan-India consumer — the comfortable 80% of this product",
    "newElement": "What is genuinely new or unfamiliar to the mass consumer — the exciting 20%",
    "fluentLaunchStrategy": "1-2 sentence strategy: exactly how to use the familiar anchor to make the new element feel safe to try. Name the hook.",
    "nationalLaunchReadiness": "Ready Now|Needs Bridge Story|Needs Community First|Needs Education Campaign"
  },
  "stateSpeciality": {
    "primaryState": "string",
    "region": "string",
    "origin": "string (2-3 sentences on history/origin)",
    "culturalSignificance": "string (2-3 sentences)",
    "storytelling": "string (3-5 sentences — evocative, editorial quality, first or second person perspective)",
    "bestSeason": "string"
  },
  "positioning": {
    "brandLadderRange": "Daily Rituals Series|Healthier Treats|Artisanal Signatures|Inspired Treasures",
    "brandLadderRationale": "string (2-3 sentences)",
    "standalone": {
      "functionalBenefits": ["string", "string", "string"],
      "functionalRTB": ["string", "string", "string"],
      "emotionalBenefits": ["string", "string", "string"],
      "emotionalRTB": ["string", "string", "string"]
    }
  },
  "functionalCallouts": [
    {"claim":"string","badge":"string","explanation":"string","category":"No Nasties|Protein|Calcium|Iron|Low GI|Healthy Fat|Digestive Health|Energy|Antioxidant|Other"},
    {"claim":"string","badge":"string","explanation":"string","category":"string"},
    {"claim":"string","badge":"string","explanation":"string","category":"string"},
    {"claim":"string","badge":"string","explanation":"string","category":"string"}
  ],
  "ingredients": {
    "aiGenerated": true,
    "list": [
      {"name":"string","proportion":"string","role":"string","functionalHighlight":"string"}
    ]
  },
  "productDescriptors": [
    {"title":"string","descriptor":"string (3-5 sentences, editorial/craft storytelling)","principle":"PRINCIPLE NAME (e.g. Effort Heuristic (Sutherland S2))","rationale":"string (1-2 sentences explaining why this principle applies)"},
    {"title":"string","descriptor":"string","principle":"string","rationale":"string"},
    {"title":"string","descriptor":"string","principle":"string","rationale":"string"}
  ],
  "competition": [
    {"brand":"string","product":"string","priceINR":"string","grammage":"string","pricePerGram":"string","channel":"string","positioning":"string"},
    {"brand":"string","product":"string","priceINR":"string","grammage":"string","pricePerGram":"string","channel":"string","positioning":"string"},
    {"brand":"string","product":"string","priceINR":"string","grammage":"string","pricePerGram":"string","channel":"string","positioning":"string"},
    {"brand":"string","product":"string","priceINR":"string","grammage":"string","pricePerGram":"string","channel":"string","positioning":"string"},
    {"brand":"string","product":"string","priceINR":"string","grammage":"string","pricePerGram":"string","channel":"string","positioning":"string"}
  ]
}`

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        contents: [{parts: [{text: prompt}]}],
        generationConfig: {temperature: 0.7, maxOutputTokens: 4000}
      })
    })
    const geminiData = await geminiRes.json()
    if (geminiData.error) {
      return res.status(500).json({ error: 'Gemini API error: ' + geminiData.error.message, code: geminiData.error.code })
    }
    let text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) {
      return res.status(500).json({ error: 'Gemini empty response', debug: JSON.stringify(geminiData).slice(0,400) })
    }
    text = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
    const result = JSON.parse(text)
    
    // Inject DB familiarity data if available — DB scores take precedence
    if (dbProduct) {
      result.familiarityMeter = result.familiarityMeter || {}
      result.familiarityMeter.score = dbProduct.familiarityScore
      result.familiarityMeter.band = dbProduct.fluentBand
      result.familiarityMeter.familiarPct = dbProduct.familiarPct
      result.familiarityMeter.newPct = dbProduct.newPct
      result.familiarityMeter.bandDescription = FLUENT_BANDS.find(b => b.label === dbProduct.fluentBand)?.desc || ''
      // familiarAnchor, newElement, fluentLaunchStrategy, nationalLaunchReadiness come from Gemini
    }
    
    result._source = 'gemini'
    result._productId = dbProduct?.id || productName.toLowerCase().replace(/\s+/g,'-')
    return res.status(200).json(result)
  } catch (err) {
    console.error('Gemini error:', err)
    return res.status(500).json({error:'Analysis failed', details: err.message})
  }
}
