import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const CATEGORIES = ['Sweets', 'Snacks', 'Milk Mix / Beverages', 'Food Items']

const VERDICT_STYLES = {
  'Clearly South Indian':    { bg: '#E6F4EA', border: '#2D5A3D', text: '#1B4332', badge: '#2D5A3D' },
  'Primarily South Indian':  { bg: '#EDF7EE', border: '#388E3C', text: '#2E7D32', badge: '#388E3C' },
  'Partially South Indian':  { bg: '#FFF8E1', border: '#C47A1A', text: '#8B5E0A', badge: '#C47A1A' },
  'North Indian':            { bg: '#FBE9E7', border: '#C43B1F', text: '#B71C1C', badge: '#C43B1F' },
  'Western':                 { bg: '#EDE7F6', border: '#5E35B1', text: '#4527A0', badge: '#5E35B1' },
  'Pan-Indian':              { bg: '#E3F2FD', border: '#1565C0', text: '#0D47A1', badge: '#1565C0' },
}

const BRAND_LADDER_COLORS = {
  'Daily Rituals Series':    '#6B3A2A',
  'Healthier Treats':        '#2D5A3D',
  'Artisanal Signatures':    '#8B0000',
  'Inspired Treasures':      '#4A148C',
}

// ─── Section definitions ────────────────────────────────────────────
const SECTIONS = [
  { id: 'verdict',     label: 'South or Not' },
  { id: 'proxy',       label: 'SI Proxy' },
  { id: 'familiarity', label: '📊 Familiarity Meter' },
  { id: 'story',       label: 'State & Story' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'functional',  label: 'Functional' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'descriptors', label: 'Descriptors' },
  { id: 'competition', label: 'Competition' },
]

// ─── Familiarity band config ─────────────────────────────────────────
const BAND_CONFIG = {
  'Mass Category':      { color: '#1a7f4b', bg: '#e6f7ef', emoji: '🟢', tag: 'Ready Now' },
  'Sweet Spot':         { color: '#2e6dce', bg: '#e8f0fb', emoji: '⭐', tag: 'Ready Now' },
  'Bridge Required':    { color: '#b5700f', bg: '#fdf3e3', emoji: '🟡', tag: 'Needs Bridge Story' },
  'Regional Champion':  { color: '#7c4fa0', bg: '#f4ecfb', emoji: '🟣', tag: 'Needs Community First' },
  'Cultural Discovery': { color: '#c43b1f', bg: '#fdecea', emoji: '🔴', tag: 'Needs Education Campaign' },
  'Hidden Gem':         { color: '#6b7280', bg: '#f3f4f6', emoji: '⚪', tag: 'Needs Education Campaign' },
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()
  const [view, setView] = useState('form')   // 'form' | 'loading' | 'results'
  const [category, setCategory] = useState('')
  const [productName, setProductName] = useState('')
  const [hasIngredients, setHasIngredients] = useState(false)
  const [ingredients, setIngredients] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  // Auto-populate from URL params (coming from Explore page)
  useEffect(() => {
    if (router.isReady && router.query.product) {
      setProductName(router.query.product)
      if (router.query.category) setCategory(router.query.category)
    }
  }, [router.isReady, router.query])

  async function handleAnalyze() {
    if (!category || !productName.trim()) return
    setView('loading')
    setError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, category, hasIngredients, ingredients }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }
      const data = await res.json()
      setResults(data)
      setView('results')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setView('form')
    }
  }

  function handleReset() {
    setView('form')
    setResults(null)
    setProductName('')
    setCategory('')
    setHasIngredients(false)
    setIngredients('')
    setError(null)
  }

  return (
    <>
      <Head>
        <title>South or Not · Sweet Karam Coffee</title>
        <meta name="description" content="Product intelligence tool for South Indian snacks & sweets innovation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="app">
        <Header />

        <main className="main">
          {view === 'form' && (
            <AnalyzerForm
              category={category}
              setCategory={setCategory}
              productName={productName}
              setProductName={setProductName}
              hasIngredients={hasIngredients}
              setHasIngredients={setHasIngredients}
              ingredients={ingredients}
              setIngredients={setIngredients}
              onSubmit={handleAnalyze}
              error={error}
            />
          )}

          {view === 'loading' && <LoadingState productName={productName} />}

          {view === 'results' && results && (
            <ResultsPanel results={results} onReset={handleReset} />
          )}
        </main>
      </div>
    </>
  )
}

// ─── Header ─────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <span className="brand-tag">Sweet Karam Coffee — Product Intelligence</span>
        <h1 className="header-title">
          South or Not<span className="header-dot">.</span>
        </h1>
        <p className="header-sub">
          Is it South Indian? Find out — and find your launch angle.
        </p>
      </div>
      <div className="header-pattern" />
    </header>
  )
}

// ─── Analyzer Form ────────────────────────────────────────────────
function AnalyzerForm({
  category, setCategory,
  productName, setProductName,
  hasIngredients, setHasIngredients,
  ingredients, setIngredients,
  onSubmit, error,
}) {
  const canSubmit = category && productName.trim().length > 0

  return (
    <div className="form-container">
      {/* Step 1: Category */}
      <div className="form-section">
        <label className="form-label">
          <span className="step-number">01</span>
          What category is this product?
        </label>
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-btn${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Product Name */}
      <div className="form-section">
        <label className="form-label" htmlFor="productName">
          <span className="step-number">02</span>
          Name of the product
          <span className="label-hint">Typos are okay — we'll figure it out</span>
        </label>
        <input
          id="productName"
          className="text-input"
          type="text"
          placeholder="e.g., Murukku, Mysorepak, Bhujia, Gujjia..."
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && onSubmit()}
          autoComplete="off"
        />
      </div>

      {/* Step 3: Ingredients */}
      <div className="form-section">
        <label className="form-label">
          <span className="step-number">03</span>
          Do you have the ingredient list?
        </label>
        <div className="toggle-row">
          <button
            type="button"
            className={`toggle-btn${!hasIngredients ? ' active' : ''}`}
            onClick={() => setHasIngredients(false)}
          >
            No — generate for me
          </button>
          <button
            type="button"
            className={`toggle-btn${hasIngredients ? ' active' : ''}`}
            onClick={() => setHasIngredients(true)}
          >
            Yes — I'll add it
          </button>
        </div>
        {hasIngredients && (
          <textarea
            className="text-area"
            placeholder={`List your ingredients with proportions:\ne.g., Urad Dal - 40%, Rice Flour - 30%, Sesame Seeds - 15%, Salt - 5%, Oil - 10%`}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={5}
          />
        )}
      </div>

      {error && <p className="error-msg">⚠ {error}</p>}

      <button
        type="button"
        className={`analyze-btn${!canSubmit ? ' disabled' : ''}`}
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        Analyze Product →
      </button>
    </div>
  )
}

// ─── Loading State ─────────────────────────────────────────────────
function LoadingState({ productName }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner-lg" />
      <p className="loading-headline">Analyzing {productName || 'your product'}…</p>
      <p className="loading-sub">
        Checking South Indian roots, finding proxies, building positioning
      </p>
    </div>
  )
}

// ─── Results Panel ─────────────────────────────────────────────────
function ResultsPanel({ results, onReset }) {
  const [activeSection, setActiveSection] = useState('verdict')

  const {
    correctedName,
    southIndianStatus,
    southIndianProxy,
    familiarityMeter,
    stateSpeciality,
    positioning,
    functionalCallouts,
    ingredients,
    productDescriptors,
    competition,
  } = results

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === 'proxy') return southIndianProxy?.applicable === true
    return true
  })

  const verdictStyle =
    VERDICT_STYLES[southIndianStatus?.verdict] || VERDICT_STYLES['Pan-Indian']

  return (
    <div className="results-container">
      {/* Results Header */}
      <div className="results-header">
        <div>
          <p className="results-analyzing">Analysis for</p>
          <h2 className="results-product-name">{correctedName || 'Product'}</h2>
        </div>
        <button className="back-btn" type="button" onClick={onReset}>
          ← New Product
        </button>
      </div>

      {/* Section Nav */}
      <nav className="section-nav" aria-label="Results sections">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`section-nav-btn${activeSection === s.id ? ' active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Section Content */}
      <div className="section-content">
        {/* ── 1. VERDICT ── */}
        {activeSection === 'verdict' && (
          <div
            className="card verdict-card"
            style={{
              borderColor: verdictStyle.border,
              background: verdictStyle.bg,
            }}
          >
            <div className="verdict-top">
              <span
                className="verdict-badge"
                style={{ background: verdictStyle.badge }}
              >
                {southIndianStatus?.verdict}
              </span>
              <div className="verdict-flags">
                {southIndianStatus?.productLed && (
                  <span className="flag product-led">Product-Led ✓</span>
                )}
                {southIndianStatus?.flavorLed && (
                  <span className="flag flavor-led">Flavor-Led ✓</span>
                )}
                {!southIndianStatus?.productLed && !southIndianStatus?.flavorLed && (
                  <span className="flag neither">Neither</span>
                )}
              </div>
            </div>

            <p className="verdict-summary" style={{ color: verdictStyle.text }}>
              {southIndianStatus?.overallSummary}
            </p>

            <div className="verdict-detail-grid">
              <div className="verdict-detail-item">
                <strong>Product-Led?</strong>
                <p>{southIndianStatus?.productLedExplanation}</p>
              </div>
              <div className="verdict-detail-item">
                <strong>Flavor-Led?</strong>
                <p>{southIndianStatus?.flavorLedExplanation}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. SI PROXY ── */}
        {activeSection === 'proxy' && southIndianProxy?.applicable && (
          <div className="card">
            <div className="card-header">
              <h3>Closest South Indian Proxy</h3>
              <span className="card-tag">Launch Angle</span>
            </div>

            <div className="proxy-main">
              <div className="proxy-name">{southIndianProxy?.proxyProduct}</div>
              <div className="proxy-state">from {southIndianProxy?.proxyState}</div>
            </div>

            <p className="proxy-similarity">
              <strong>Visual / Taste Similarity: </strong>
              {southIndianProxy?.visualSimilarity}
            </p>

            <div className="proxy-box">
              <p className="proxy-box-label">Sweet Karam Coffee Launch Angle</p>
              <p>{southIndianProxy?.launchAngle}</p>
            </div>

            <div className="proxy-name-box">
              <p className="proxy-box-label">Suggested South Indian Name</p>
              <p className="proxy-suggested-name">{southIndianProxy?.suggestedName}</p>
            </div>
          </div>
        )}

        {/* ── 3. FAMILIARITY METER ── */}
        {activeSection === 'familiarity' && (() => {
          const fm = familiarityMeter || {}
          const score = fm.score || 0
          const band = fm.band || 'Cultural Discovery'
          const cfg = BAND_CONFIG[band] || BAND_CONFIG['Cultural Discovery']
          const familiarPct = fm.familiarPct || score
          const newPct = 100 - familiarPct
          // Sub-dimension scores (stored in DB or fallback)
          const dims = fm.dimensions || {}
          const nr = dims.nameRecognition ?? Math.round(score * 0.27)
          const fp = dims.formatProxy ?? Math.round(score * 0.27)
          const fa = dims.flavorAccess ?? Math.round(score * 0.23)
          const vt = dims.visualTexture ?? Math.round(score * 0.23)

          return (
            <div className="card familiarity-card">
              {/* Header */}
              <div className="card-header">
                <h3>Familiarity Meter</h3>
                <span className="card-tag" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}>
                  {cfg.emoji} {band}
                </span>
              </div>

              {/* Score + Bar row */}
              <div className="fm-top-row">
                {/* Big score */}
                <div className="fm-score-block" style={{ borderColor: cfg.color }}>
                  <span className="fm-score-num" style={{ color: cfg.color }}>{score}</span>
                  <span className="fm-score-denom">/100</span>
                  <div className="fm-score-label">Fluency Score</div>
                </div>

                {/* Bar + 80/20 logic */}
                <div className="fm-bar-block">
                  <div className="fm-band-title" style={{ color: cfg.color }}>{band}</div>
                  <div className="fm-band-desc">{fm.bandDescription || ''}</div>

                  {/* The main bar */}
                  <div className="fm-bar-wrap">
                    <div className="fm-bar-track">
                      <div
                        className="fm-bar-familiar"
                        style={{ width: `${familiarPct}%`, background: cfg.color }}
                      />
                      <div
                        className="fm-bar-new"
                        style={{ width: `${newPct}%` }}
                      />
                    </div>
                    <div className="fm-bar-labels">
                      <span style={{ color: cfg.color }}>■ {familiarPct}% Familiar</span>
                      <span style={{ color: '#b5700f' }}>■ {newPct}% New</span>
                    </div>
                  </div>

                  {/* 80/20 zone indicator */}
                  <div className="fm-ideal-note">
                    {familiarPct >= 70 && familiarPct <= 85
                      ? '⭐ In the ideal Fluent Innovation zone (70–85% familiar)'
                      : familiarPct > 85
                      ? '⚠ Too familiar — needs differentiation, not education'
                      : '⚠ Below the ideal zone — bridge story or education needed'}
                  </div>
                </div>
              </div>

              {/* Familiar / New split */}
              <div className="fm-split-grid">
                <div className="fm-split-item fm-familiar-side">
                  <div className="fm-split-label" style={{ color: cfg.color }}>What feels FAMILIAR</div>
                  <p className="fm-split-text">{fm.familiarAnchor || '—'}</p>
                </div>
                <div className="fm-split-divider" />
                <div className="fm-split-item fm-new-side">
                  <div className="fm-split-label" style={{ color: '#b5700f' }}>What is GENUINELY NEW</div>
                  <p className="fm-split-text">{fm.newElement || '—'}</p>
                </div>
              </div>

              {/* Launch Strategy */}
              {fm.fluentLaunchStrategy && (
                <div className="fm-strategy-box">
                  <div className="fm-strategy-label">💡 Fluent Launch Strategy</div>
                  <p className="fm-strategy-text">{fm.fluentLaunchStrategy}</p>
                </div>
              )}

              {/* Readiness badge */}
              <div className="fm-readiness-row">
                <span className="fm-readiness-label">National Launch Readiness:</span>
                <span
                  className="fm-readiness-badge"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}` }}
                >
                  {fm.nationalLaunchReadiness || cfg.tag}
                </span>
              </div>

              {/* 4-dimension sub-scores */}
              <div className="fm-dimensions">
                <div className="fm-dim-header">How the score breaks down</div>
                <div className="fm-dim-grid">
                  {[
                    { label: 'Name Recognition', val: nr, max: 25, tip: 'How well-known is the product name nationally?' },
                    { label: 'Format Proxy', val: fp, max: 25, tip: 'Does a national equivalent format exist?' },
                    { label: 'Flavour Accessibility', val: fa, max: 25, tip: 'Is the flavour profile intuitive to a non-SI palate?' },
                    { label: 'Visual & Texture', val: vt, max: 25, tip: 'Does it look/feel like something familiar?' },
                  ].map((d) => (
                    <div key={d.label} className="fm-dim-item">
                      <div className="fm-dim-row">
                        <span className="fm-dim-name">{d.label}</span>
                        <span className="fm-dim-val" style={{ color: cfg.color }}>{d.val}<span className="fm-dim-max">/{d.max}</span></span>
                      </div>
                      <div className="fm-dim-bar-track">
                        <div
                          className="fm-dim-bar-fill"
                          style={{ width: `${(d.val / d.max) * 100}%`, background: cfg.color }}
                        />
                      </div>
                      <div className="fm-dim-tip">{d.tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── 4. STATE & STORY ── */}
        {activeSection === 'story' && (
          <div className="card">
            <div className="card-header">
              <h3>State Speciality & Story</h3>
              <span className="card-tag state-tag">{stateSpeciality?.primaryState}</span>
            </div>

            {stateSpeciality?.region && (
              <p className="story-region">📍 {stateSpeciality.region}</p>
            )}

            <div className="story-block">
              <p className="story-text">{stateSpeciality?.storytelling}</p>
            </div>

            <div className="story-grid">
              <div>
                <strong>Origin</strong>
                <p>{stateSpeciality?.origin}</p>
              </div>
              <div>
                <strong>Cultural Significance</strong>
                <p>{stateSpeciality?.culturalSignificance}</p>
              </div>
              <div>
                <strong>Best Season / Occasion</strong>
                <p>{stateSpeciality?.bestSeason}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. POSITIONING ── */}
        {activeSection === 'positioning' && (
          <div className="positioning-container">
            {/* Brand Ladder */}
            <div className="card brand-ladder-card">
              <div className="card-header">
                <h3>Brand Ladder Fit</h3>
              </div>
              <div
                className="ladder-range"
                style={{
                  borderColor:
                    BRAND_LADDER_COLORS[positioning?.brandLadderRange] || '#C43B1F',
                }}
              >
                <span
                  className="ladder-range-name"
                  style={{
                    color:
                      BRAND_LADDER_COLORS[positioning?.brandLadderRange] || '#C43B1F',
                  }}
                >
                  {positioning?.brandLadderRange}
                </span>
                <p>{positioning?.brandLadderRationale}</p>
              </div>
              <div className="ladder-visual">
                {Object.keys(BRAND_LADDER_COLORS).map((range) => (
                  <div
                    key={range}
                    className={`ladder-item${positioning?.brandLadderRange === range ? ' active' : ''}`}
                    style={
                      positioning?.brandLadderRange === range
                        ? {
                            background: BRAND_LADDER_COLORS[range],
                            color: '#fff',
                            borderColor: 'transparent',
                          }
                        : {}
                    }
                  >
                    {range}
                  </div>
                ))}
              </div>
            </div>

            {/* 4-Quadrant Positioning */}
            <div className="positioning-grid">
              <div className="pos-card functional">
                <div className="pos-card-header">Functional Benefits</div>
                <ul>
                  {positioning?.standalone?.functionalBenefits?.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="pos-card f-rtb">
                <div className="pos-card-header">Functional RTB</div>
                <ul>
                  {positioning?.standalone?.functionalRTB?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="pos-card emotional">
                <div className="pos-card-header">Emotional Benefits</div>
                <ul>
                  {positioning?.standalone?.emotionalBenefits?.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="pos-card e-rtb">
                <div className="pos-card-header">Emotional RTB</div>
                <ul>
                  {positioning?.standalone?.emotionalRTB?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. FUNCTIONAL CALLOUTS ── */}
        {activeSection === 'functional' && (
          <div className="card">
            <div className="card-header">
              <h3>Functional Callouts</h3>
              <span className="card-tag">For Packaging & Marketing</span>
            </div>
            {functionalCallouts?.length > 0 ? (
              <div className="callout-grid">
                {functionalCallouts.map((c, i) => (
                  <div key={i} className="callout-item">
                    <div className="callout-badge">{c.claim}</div>
                    <div className="callout-badge-detail">{c.badge}</div>
                    <div className="callout-category">{c.category}</div>
                    <p className="callout-explanation">{c.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                No specific functional callouts were identified for this product.
              </p>
            )}
          </div>
        )}

        {/* ── 6. INGREDIENTS ── */}
        {activeSection === 'ingredients' && (
          <div className="card">
            <div className="card-header">
              <h3>Ingredient Breakdown</h3>
              {ingredients?.aiGenerated && (
                <span className="card-tag ai-tag">✦ AI Generated</span>
              )}
            </div>

            {ingredients?.list?.length > 0 ? (
              <div className="ingredients-table">
                <div className="ing-header-row">
                  <span>Ingredient</span>
                  <span>Proportion</span>
                  <span>Role in Product</span>
                  <span>Functional Highlight</span>
                </div>
                {ingredients.list.map((ing, i) => (
                  <div key={i} className="ing-row">
                    <span className="ing-name">{ing.name}</span>
                    <span className="ing-prop">{ing.proportion}</span>
                    <span className="ing-role">{ing.role}</span>
                    <span className="ing-func">{ing.functionalHighlight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                No ingredient data available.
              </p>
            )}
          </div>
        )}

        {/* ── 7. PRODUCT DESCRIPTORS ── */}
        {activeSection === 'descriptors' && (
          <div className="card">
            <div className="card-header">
              <h3>Product Descriptors</h3>
              <span className="card-tag">Behavioral Science–Informed</span>
            </div>
            <div className="descriptors-grid">
              {productDescriptors?.map((d, i) => (
                <div key={i} className="descriptor-card">
                  <div className="descriptor-num">0{i + 1}</div>
                  <h4 className="descriptor-title">{d.title}</h4>
                  <p className="descriptor-text">{d.descriptor}</p>
                  <div className="descriptor-footer">
                    <span className="principle-badge">{d.principle}</span>
                    <p className="descriptor-rationale">{d.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 8. COMPETITION ── */}
        {activeSection === 'competition' && (
          <div className="card">
            <div className="card-header">
              <h3>Top 5 Competition</h3>
              <span className="card-tag">Market Intelligence</span>
            </div>
            {competition?.length > 0 ? (
              <>
                <div className="competition-grid">
                  {competition.map((c, i) => (
                    <div key={i} className="comp-card">
                      <div className="comp-num">{i + 1}</div>
                      <div className="comp-info">
                        <div className="comp-brand">{c.brand}</div>
                        <div className="comp-product">{c.product}</div>
                        <p className="comp-positioning">{c.positioning}</p>
                        <div className="comp-stats">
                          <span>₹{c.priceINR}</span>
                          <span>{c.grammage}</span>
                          {c.pricePerGram && <span>{c.pricePerGram}</span>}
                          <span>{c.channel}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="competition-disclaimer">
                  ⚠ Competition pricing and grammage data is approximate and based on AI knowledge. Please verify current prices before strategic decisions.
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                No competition data found for this product.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
