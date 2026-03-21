/**
 * Cache Generation Script
 * Run: node scripts/generate-cache.js
 * 
 * Pre-generates Gemini analyses for all products in the DB
 * and saves them to data/cache/{product-id}.json
 * Commit the cache directory to the repo for instant loads on Vercel.
 * 
 * Set GEMINI_API_KEY in .env.local before running.
 */

const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache')
const PRODUCTS_PATH = path.join(__dirname, '..', 'data', 'products.json')
const DELAY_MS = 1500 // Respect free-tier rate limits (~40 RPM)

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set. Add it to .env.local')
  process.exit(1)
}

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'))

// ─── All 25 Shotton Biases + Sutherland Principles ─────────────────
const ALL_PRINCIPLES = `
BEHAVIORAL SCIENCE PRINCIPLES — pick 3 different ones for the 3 descriptors.

FROM RICHARD SHOTTON — BIAS & HOW TO APPLY FOR COPYWRITING:
1. FUNDAMENTAL ATTRIBUTION ERROR: Context > personality. Design for the moment. Target context as hard as audience.
2. SOCIAL PROOF: State popularity with specificity — "preferred by coffee lovers" not just "bestselling." Familiarity breeds commitment.
3. NEGATIVE SOCIAL PROOF FLIP: Never say an unwanted behavior is common. Flip: "97% don't steal." Injunctive norms > descriptive norms.
4. DISTINCTIVENESS (Von Restorff): When the world zigs, you zag. Isolation effect — be the odd one out. Subvert category norms.
5. HABIT: Break automatic behavior. Target life events (marriage, new job, baby). Advertise at reflection moments (age ending in 9).
6. PAIN OF PAYMENT: Charm pricing (ending in 9). Break amounts into daily figures. Backstory > discount. Remove currency symbols.
7. DANGER OF CLAIMED DATA: People lie. Ask how others behave. Don't ask, observe. Search data is honest.
8. MOOD: Target Friday-Saturday (40% happier). Match message energy to mood. Happy consumers recall 56% of ads vs 36% stressed.
9. PRICE RELATIVITY (Anchoring): Compare against more expensive set. Introduce higher-end line. DeBeers "two months salary" anchor.
10. PRIMACY EFFECT: First impression colors everything. Lead with easiest-to-associate quality first. Get in early in consideration.
11. EXPECTANCY THEORY: Presentation creates experience. "Cajun Red Beans" beats "Red Beans" — same food, 13% more appeal. Name origin, process, specific ingredient.
12. CONFIRMATION BIAS: Reach rejectors when distracted. Use subtle cues not direct claims. Opera, not "we're luxurious."
13. OVERCONFIDENCE: Communicate averages — overconfident people will try to beat them to feel superior.
14. WISHFUL SEEING: Brand purpose is often wishful seeing. Extraordinary claims need extraordinary evidence.
15. MEDIA CONTEXT: Where ad appears shapes believability. Perceived waste (mass advertising) builds trust for targeted ads.
16. CURSE OF KNOWLEDGE: Consumers give 0.9 seconds. Evaluate as a listener, not a maker. Most consumers are satisficers.
17. GOODHART'S LAW: When measure becomes target, it fails. Measure brand health and long-term, not just clicks.
18. PRATFALL EFFECT: Admitting a flaw makes other claims believable. VW "looks ugly but gets you there." Works for strong brands — makes weak brands weaker. Rough-edged cookies outsell smooth 66%.
19. WINNER'S CURSE: Identify audiences others haven't. Target based on occasions — payday, birthdays, windfalls (unearned money spent freely).
20. POWER OF GROUP: Social context amplifies experience. Prioritize group-viewing moments. People laugh 21% more in groups.
21. VEBLEN GOODS: Expensive = better. Advertise your premium line to elevate your whole portfolio. Promotions are "bad cholesterol."
22. REPLICABILITY CRISIS: Test small before scaling. Single studies aren't proof. 20% confidence + big upside is worth acting on.
23. VARIABILITY: Scarcity in romantic moments; social proof in fearful ones. Match the bias to the context and task.
24. COCKTAIL PARTY EFFECT: Localisation over personalisation. "Offer in Tirunelveli" beats "Offer in India." Bridges trust gap.
25. SCARCITY: Limit quantity to boost demand. "Available while jackfruit harvest lasts." Loss framing: what you lose by not buying.

FROM RORY SUTHERLAND — ALCHEMY:
S1. PSYCHO-LOGIC OVER LOGIC: Not everything that makes sense works. The best solution is often the counterintuitive one.
S2. EFFORT HEURISTIC (Betty Crocker/Ikea): Perceived effort = perceived value. "Just add eggs" > "just add water." Stone-ground, three-day process.
S3. GEOGRAPHICAL PROVENANCE: Adding a specific place name adds 27%+ perceived value. "Tirunelveli-style." "Chettinad recipe."
S4. REFRAMING: "50 paise a day" vs "₹15/month." Same price, different perception. What frame makes it feel like a ritual?
S5. LOSS AVERSION: People feel losses 2x more than gains. "The Sunday that isn't right without it." Reframe buying as not-losing.
S6. SIGNAL THEORY: Costly signals are believed — cheap signals are noise. A heavy bottle, a difficult process signals quality.
S7. PLACEBO EFFECT AS DESIGN: Night Nurse's drowsiness became its selling point. Design rituals that create conviction.
S8. SATISFICING NOT OPTIMIZING: People choose the safest option, not the best. Reduce variance of disappointment.
S9. AFFORDANCE — LESS IS MORE: Single purpose clarity outsells multi-feature confusion. Google beat Yahoo by removing clutter.
S10. EXCLUSIVE FRAMING: "Only for royal families" made potatoes desirable. Restriction creates desire. Elixir of exclusivity.

RULES: Pick exactly 3 DIFFERENT principles for the 3 descriptors. One cultural/geographic (S3 or 4), one loss/emotion (S5 or 25 or 18), one effort/signal (S2 or S1 or 11). Apply the principle directly in the copy. Name it in the "principle" field.`

function buildPrompt(product) {
  return `You are a senior food innovation strategist for Sweet Karam Coffee (sweetkaramcoffee.in), a premium South Indian Sweets & Snacks D2C brand.

STRICT DEFINITIONS:
- South India = ONLY: Karnataka, Kerala, Tamil Nadu, Telangana, Andhra Pradesh
- Product-Led: the PRODUCT ITSELF originates from South India
- Flavor-Led: South Indian ingredient/flavor in a non-South-Indian base product
- Both axes independent

BRAND LADDER RANGES:
- Daily Rituals Series — everyday, familiar, tea-time
- Healthier Treats — functional, nutrition-forward
- Artisanal Signatures — craft, heritage, provenance
- Inspired Treasures — innovation, fusion, premium gifting

VERIFIED FACTS FOR THIS PRODUCT (do not contradict):
- Name: ${product.name}
- SI Status: ${product.southIndianStatus}
- Product-Led: ${product.productLed}
- Flavor-Led: ${product.flavorLed}
- Primary State: ${product.primaryState}
- States: ${(product.states || []).join(', ')}
- Region: ${product.region || ''}
- Festivals: ${(product.festivals || []).join(', ')}
- Seasons: ${(product.seasons || []).join(', ')}
- Ingredients: ${(product.ingredients || []).join(', ')}
- Positioning Range: ${product.positioningRange}
${product.proxyOf ? `- SI Proxy: ${product.proxyOf} from ${product.proxyState}
- Proxy Similarity: ${product.proxySimilarity || ''}
- Launch Angle: ${product.launchAngle || ''}` : ''}

${ALL_PRINCIPLES}

Generate the full Sweet Karam Coffee analysis for: ${product.name} (Category: ${product.category || 'Snacks'})

Return ONLY a valid JSON object. No markdown fences. Start with { end with }.

{
  "correctedName": "${product.name}",
  "dbMatchFound": true,
  "southIndianStatus": {
    "isSouthIndian": ${product.productLed || product.flavorLed},
    "verdict": "${product.southIndianStatus}",
    "productLed": ${product.productLed},
    "flavorLed": ${product.flavorLed},
    "productLedExplanation": "1-2 sentences",
    "flavorLedExplanation": "1-2 sentences",
    "overallSummary": "2-3 punchy sentences"
  },
  "southIndianProxy": {
    "applicable": ${!!product.proxyOf},
    "proxyProduct": "${product.proxyOf || ''}",
    "proxyState": "${product.proxyState || ''}",
    "visualSimilarity": "describe similarity",
    "launchAngle": "launch angle",
    "suggestedName": "South Indian name"
  },
  "stateSpeciality": {
    "primaryState": "${product.primaryState}",
    "region": "${product.region || ''}",
    "origin": "2-3 sentences with historical context",
    "culturalSignificance": "festivals rituals occasions",
    "storytelling": "3-4 sentence evocative packaging-quality story",
    "bestSeason": "${(product.seasons || []).join(', ')}"
  },
  "positioning": {
    "brandLadderRange": "${product.positioningRange}",
    "brandLadderRationale": "2 sentences",
    "standalone": {
      "functionalBenefits": ["benefit 1", "benefit 2", "benefit 3"],
      "functionalRTB": ["proof 1", "proof 2", "proof 3"],
      "emotionalBenefits": ["feeling 1", "feeling 2", "feeling 3"],
      "emotionalRTB": ["proof 1", "proof 2", "proof 3"]
    }
  },
  "functionalCallouts": [
    {
      "claim": "claim",
      "badge": "badge text",
      "explanation": "ingredient basis",
      "category": "category"
    }
  ],
  "ingredients": {
    "aiGenerated": false,
    "list": [
      {
        "name": "ingredient",
        "proportion": "proportion",
        "role": "role",
        "functionalHighlight": "benefit"
      }
    ]
  },
  "productDescriptors": [
    {
      "title": "3-5 word headline",
      "descriptor": "2-3 sentences applying the principle in the copy",
      "principle": "exact principle name",
      "rationale": "1 sentence"
    },
    {
      "title": "second angle",
      "descriptor": "2-3 sentences different approach",
      "principle": "different principle",
      "rationale": "1 sentence"
    },
    {
      "title": "cultural/geographic angle",
      "descriptor": "2-3 sentences",
      "principle": "third distinct principle",
      "rationale": "1 sentence"
    }
  ],
  "competition": [
    {
      "brand": "brand",
      "product": "product",
      "priceINR": "price",
      "grammage": "weight",
      "pricePerGram": "price/g",
      "channel": "channel",
      "positioning": "1 sentence"
    }
  ]
}`
}

async function callGemini(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateAll() {
  const skipExisting = process.argv.includes('--skip-existing')
  let generated = 0, skipped = 0, failed = 0

  console.log(`\n🚀 Sweet Karam Coffee — Cache Generator`)
  console.log(`📦 Products to process: ${products.length}`)
  console.log(`📁 Cache directory: ${CACHE_DIR}`)
  console.log(`⏱  Delay between calls: ${DELAY_MS}ms`)
  if (skipExisting) console.log(`⏭  Skipping existing cache files`)
  console.log('─'.repeat(50))

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const cachePath = path.join(CACHE_DIR, `${product.id}.json`)

    if (skipExisting && fs.existsSync(cachePath)) {
      console.log(`[${i+1}/${products.length}] ⏭  ${product.name} — skipped (cached)`)
      skipped++
      continue
    }

    process.stdout.write(`[${i+1}/${products.length}] ⚙️  ${product.name}... `)

    try {
      const prompt = buildPrompt(product)
      const rawJson = await callGemini(prompt)
      const parsed = JSON.parse(rawJson)
      parsed._cachedAt = new Date().toISOString()
      parsed._productId = product.id
      fs.writeFileSync(cachePath, JSON.stringify(parsed, null, 2), 'utf8')
      console.log(`✅ cached`)
      generated++
    } catch (err) {
      console.log(`❌ failed: ${err.message}`)
      failed++
    }

    // Respect rate limits
    if (i < products.length - 1) await sleep(DELAY_MS)
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Generated: ${generated}`)
  console.log(`⏭  Skipped: ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('\n💡 Commit data/cache/ to your repo before deploying to Vercel.')
  console.log('   git add data/cache/ && git commit -m "Add pre-generated analysis cache"')
}

generateAll().catch(console.error)
