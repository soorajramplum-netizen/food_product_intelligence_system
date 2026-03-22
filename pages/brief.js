import { useState, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { readFileSync } from 'fs'
import path from 'path'

export async function getStaticProps() {
  const products = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8'))
  return { props: { products } }
}

const BAND_COLOR = {
  'Mass Category':      { color:'#1a7f4b', bg:'#e6f7ef' },
  'Sweet Spot':         { color:'#2e6dce', bg:'#e8f0fb' },
  'Bridge Required':    { color:'#b5700f', bg:'#fdf3e3' },
  'Regional Champion':  { color:'#7c4fa0', bg:'#f4ecfb' },
  'Cultural Discovery': { color:'#c43b1f', bg:'#fdecea' },
  'Hidden Gem':         { color:'#6b7280', bg:'#f3f4f6' },
}

const BAND_ORDER = { 'Sweet Spot':0,'Bridge Required':1,'Regional Champion':2,'Mass Category':3,'Cultural Discovery':4,'Hidden Gem':5 }

function getTopProducts(products, categoryFilter) {
  const filtered = categoryFilter === 'Other'
    ? products.filter(p => !['Sweets','Snacks'].includes(p.category))
    : products.filter(p => p.category === categoryFilter)
  return filtered
    .sort((a,b) => (BAND_ORDER[a.fluentBand]||9) - (BAND_ORDER[b.fluentBand]||9) || b.familiarityScore - a.familiarityScore)
    .slice(0, 5)
}

export default function Brief({ products }) {
  const [briefCategory, setBriefCategory] = useState('Sweets')
  const [boardroomText, setBoardroomText] = useState('')
  const [boardroomLoading, setBoardroomLoading] = useState(false)
  const [boardroomError, setBoardroomError] = useState('')

  // ── WEEKLY BRIEF DATA ──
  const briefProducts = useMemo(() => getTopProducts(products, briefCategory), [products, briefCategory])

  // ── 2x2 RADAR DATA (Snacks + Sweets only) ──
  const radarProducts = useMemo(() => {
    return products
      .filter(p => ['Snacks','Sweets'].includes(p.category))
      .filter(p => p.familiarityScore && p.familiarityScore > 0)
      .sort((a,b) => b.familiarityScore - a.familiarityScore)
      .slice(0, 60) // cap at 60 for readability
  }, [products])

  // ── BOARDROOM SLIDE ──
  async function generateBoardroom() {
    setBoardroomLoading(true)
    setBoardroomError('')
    setBoardroomText('')
    try {
      // Build stats from products
      const totalProducts = products.length
      const sweetSpot = products.filter(p => p.fluentBand === 'Sweet Spot').length
      const massCat = products.filter(p => p.fluentBand === 'Mass Category').length
      const regional = products.filter(p => p.fluentBand === 'Regional Champion').length
      const topLaunch = products
        .filter(p => p.fluentBand === 'Sweet Spot')
        .sort((a,b) => b.familiarityScore - a.familiarityScore)
        .slice(0, 3)
        .map(p => `${p.name} (${p.primaryState}, Score: ${p.familiarityScore})`)
        .join(', ')
      const topStates = ['Tamil Nadu','Karnataka','Kerala','Andhra Pradesh','Telangana']
        .map(s => ({ state: s, count: products.filter(p => p.primaryState === s).length }))

      const prompt = `You are a senior strategy consultant presenting to the CEO and CMO of Sweet Karam Coffee, a premium South Indian snacks and sweets brand. Generate a concise, high-impact boardroom briefing based on this product intelligence data:

PRODUCT PORTFOLIO: ${totalProducts} South Indian products mapped and scored
- Sweet Spot (ready to launch nationally): ${sweetSpot} products  
- Mass Category (already mainstream, needs differentiation): ${massCat} products
- Regional Champion (strong locally, needs bridge): ${regional} products
- Top 3 immediate launch recommendations: ${topLaunch}
- State coverage: ${topStates.map(s => `${s.state}: ${s.count} products`).join(', ')}

Write a boardroom briefing with EXACTLY this structure:
**THE SITUATION** (2 sentences: where Sweet Karam Coffee's portfolio stands nationally)
**THE OPPORTUNITY** (2 sentences: the single biggest market opportunity right now)  
**TOP 3 ACTIONS** (3 bullet points: specific, actionable, time-bound recommendations for the C-suite)
**THE RISK** (1 sentence: the one thing that could go wrong)
**THE BOTTOM LINE** (1 bold sentence: the single most important thing to act on this quarter)

Be direct, opinionated, and specific. No generic advice. Reference actual product names and states where relevant.`

      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prompt, mode: 'boardroom' })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBoardroomText(data.response)
    } catch(e) {
      setBoardroomError(e.message || 'Generation failed')
    } finally {
      setBoardroomLoading(false)
    }
  }

  // Format boardroom text with basic markdown
  function formatBoardroom(text) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'18px',fontWeight:700,color:'#1A0C06',marginTop:'20px',marginBottom:'6px'}}>{line.replace(/\*\*/g,'')}</div>
        }
        if (line.startsWith('**')) {
          return <div key={i} style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'17px',fontWeight:700,color:'#1A0C06',marginTop:'18px',marginBottom:'4px'}} dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}} />
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} style={{display:'flex',gap:'10px',fontSize:'14px',color:'#2C1A10',lineHeight:1.6,marginBottom:'6px',paddingLeft:'4px'}}><span style={{color:'#B83822',flexShrink:0}}>→</span><span>{line.slice(2)}</span></div>
        }
        if (line.trim() === '') return <div key={i} style={{height:'6px'}} />
        return <div key={i} style={{fontSize:'14px',color:'#2C1A10',lineHeight:1.65,marginBottom:'4px'}}>{line}</div>
      })
  }

  return (
    <>
      <Head>
        <title>C-Suite Brief · South or Not</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #FBF3E8; color: #281408; -webkit-font-smoothing: antialiased; }
        .brief-page { min-height: 100vh; }

        /* HEADER */
        .brief-header { background: #1A0C06; padding: 36px 0 28px; }
        .brief-header-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; }
        .brief-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #B5700F; margin-bottom: 8px; }
        .brief-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px,6vw,54px); font-weight: 700; color: #FDF6EC; line-height: 1; }
        .brief-title span { color: #B83822; }
        .brief-sub { font-size: 13px; color: rgba(253,246,236,0.4); margin-top: 8px; }

        /* MAIN */
        .brief-main { max-width: 1100px; margin: 0 auto; padding: 32px 32px 80px; display: flex; flex-direction: column; gap: 32px; }

        /* SECTION CARD */
        .brief-section { background: #fff; border: 1px solid #E8D4C0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(26,12,6,0.07); }
        .brief-section-header { padding: 20px 24px 16px; border-bottom: 1px solid #F0E4D4; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .brief-section-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #1A0C06; }
        .brief-section-sub { font-size: 12px; color: #9C7060; margin-top: 2px; }
        .brief-section-body { padding: 24px; }

        /* WEEKLY BRIEF */
        .brief-tab-row { display: flex; gap: 8px; }
        .brief-tab { padding: 6px 16px; border-radius: 100px; border: 1.5px solid #E8D4C0; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #9C7060; cursor: pointer; transition: all 0.18s; }
        .brief-tab.active { border-color: #B83822; background: #F9E8E4; color: #B83822; font-weight: 600; }
        .brief-product-grid { display: flex; flex-direction: column; gap: 10px; }
        .brief-product-card { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border: 1px solid #F0E4D4; border-radius: 10px; transition: background 0.15s; cursor: pointer; text-decoration: none; }
        .brief-product-card:hover { background: #FBF3E8; border-color: #E8D4C0; }
        .brief-rank { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 700; color: #E8D4C0; min-width: 28px; }
        .brief-product-info { flex: 1; }
        .brief-product-name { font-size: 15px; font-weight: 600; color: #1A0C06; margin-bottom: 3px; }
        .brief-product-meta { font-size: 12px; color: #9C7060; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .brief-product-score { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 800; }
        .brief-band-pill { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px; letter-spacing: 0.03em; white-space: nowrap; }
        .brief-score-bar { width: 60px; height: 4px; background: #f3f4f6; border-radius: 2px; overflow: hidden; margin-top: 4px; }
        .brief-score-fill { height: 100%; border-radius: 2px; }
        .brief-analyze-link { padding: 7px 14px; border-radius: 100px; border: 1.5px solid #B83822; color: #B83822; font-size: 12px; font-weight: 600; white-space: nowrap; transition: all 0.18s; text-decoration: none; background: transparent; }
        .brief-analyze-link:hover { background: #B83822; color: #fff; }

        /* LAUNCH RADAR 2x2 */
        .radar-wrap { position: relative; width: 100%; padding-bottom: 70%; }
        .radar-chart { position: absolute; inset: 0; }
        .radar-svg { width: 100%; height: 100%; }
        .radar-axis-label { font-family: 'DM Sans', sans-serif; font-size: 11px; fill: #9C7060; font-weight: 600; }
        .radar-quadrant-label { font-family: 'Cormorant Garamond', serif; font-size: 13px; fill: rgba(26,12,6,0.18); font-weight: 600; font-style: italic; }
        .radar-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; }
        .radar-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b5446; }
        .radar-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        /* BOARDROOM */
        .boardroom-btn { padding: 13px 28px; background: #1A0C06; color: #FDF6EC; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; gap: 8px; }
        .boardroom-btn:hover:not(:disabled) { background: #2E1608; }
        .boardroom-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .boardroom-output { margin-top: 24px; background: #FBF3E8; border: 1px solid #E8D4C0; border-radius: 10px; padding: 24px 28px; }
        .boardroom-actions { display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #E8D4C0; }
        .boardroom-action-btn { padding: 8px 18px; border-radius: 100px; border: 1.5px solid #E8D4C0; background: transparent; font-size: 12px; font-weight: 600; color: #6b5446; cursor: pointer; transition: all 0.18s; }
        .boardroom-action-btn:hover { border-color: #B83822; color: #B83822; }
        .boardroom-error { color: #B83822; font-size: 13px; margin-top: 12px; padding: 10px 14px; background: #F9E8E4; border-radius: 8px; }
        .boardroom-spinner { width: 16px; height: 16px; border: 2px solid rgba(253,246,236,0.3); border-top-color: #FDF6EC; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .brief-main { padding: 20px 16px 60px; }
          .brief-header-inner { padding: 0 16px; }
          .radar-wrap { padding-bottom: 90%; }
        }
      `}</style>

      <div className="brief-page">
        <div className="brief-header">
          <div className="brief-header-inner">
            <div className="brief-eyebrow">South or Not · Executive Intelligence</div>
            <h1 className="brief-title">C-Suite <span>Brief.</span></h1>
            <p className="brief-sub">Launch radar, weekly picks, and boardroom-ready insights — no filters needed.</p>
          </div>
        </div>

        <div className="brief-main">

          {/* ═══ SECTION 1: WEEKLY BRIEF ═══ */}
          <div className="brief-section">
            <div className="brief-section-header">
              <div>
                <div className="brief-section-title">Weekly Launch Brief</div>
                <div className="brief-section-sub">Top 5 products ready for national launch this week — sorted by fluency score</div>
              </div>
              <div className="brief-tab-row">
                {['Sweets','Snacks','Other'].map(cat => (
                  <button key={cat} className={`brief-tab${briefCategory===cat?' active':''}`} onClick={() => setBriefCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="brief-section-body">
              <div className="brief-product-grid">
                {briefProducts.map((p, i) => {
                  const bc = BAND_COLOR[p.fluentBand] || BAND_COLOR['Cultural Discovery']
                  return (
                    <div key={p.id} className="brief-product-card">
                      <div className="brief-rank">0{i+1}</div>
                      <div className="brief-product-info">
                        <div className="brief-product-name">{p.name}</div>
                        <div className="brief-product-meta">
                          <span>{p.primaryState}</span>
                          <span style={{color:'#E8D4C0'}}>·</span>
                          <span>{p.positioningRange}</span>
                          <span style={{color:'#E8D4C0'}}>·</span>
                          <span style={{color: bc.color, fontWeight:600}}>{p.familiarityNote?.slice(0,60)}{p.familiarityNote?.length > 60 ? '…' : ''}</span>
                        </div>
                        <div className="brief-score-bar" style={{marginTop:'6px'}}>
                          <div className="brief-score-fill" style={{width:`${p.familiarityScore}%`, background: bc.color}} />
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',minWidth:'48px'}}>
                        <span className="brief-product-score" style={{color: bc.color}}>{p.familiarityScore}</span>
                        <span className="brief-band-pill" style={{background: bc.bg, color: bc.color}}>{p.fluentBand}</span>
                      </div>
                      <Link
                        href={`/?product=${encodeURIComponent(p.name)}&category=${encodeURIComponent(p.category)}`}
                        className="brief-analyze-link"
                      >
                        Deep Dive →
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ═══ SECTION 2: LAUNCH RADAR 2x2 ═══ */}
          <div className="brief-section">
            <div className="brief-section-header">
              <div>
                <div className="brief-section-title">Launch Radar</div>
                <div className="brief-section-sub">Snacks & Sweets plotted by Fluency Score vs Positioning Range · Top 60 products</div>
              </div>
            </div>
            <div className="brief-section-body">
              <LaunchRadar products={radarProducts} />
            </div>
          </div>

          {/* ═══ SECTION 3: BOARDROOM SLIDE ═══ */}
          <div className="brief-section">
            <div className="brief-section-header">
              <div>
                <div className="brief-section-title">Boardroom Slide</div>
                <div className="brief-section-sub">AI-generated executive briefing from your full product portfolio — takes ~10 seconds</div>
              </div>
            </div>
            <div className="brief-section-body">
              <button className="boardroom-btn" onClick={generateBoardroom} disabled={boardroomLoading}>
                {boardroomLoading ? (
                  <><div className="boardroom-spinner" /> Generating briefing…</>
                ) : (
                  <>✦ Generate Boardroom Briefing</>
                )}
              </button>

              {boardroomError && <div className="boardroom-error">⚠ {boardroomError}</div>}

              {boardroomText && (
                <div className="boardroom-output">
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'13px',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'#9C7060',marginBottom:'16px'}}>
                    Executive Briefing · {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                  </div>
                  {formatBoardroom(boardroomText)}
                  <div className="boardroom-actions">
                    <button className="boardroom-action-btn" onClick={() => { navigator.clipboard.writeText(boardroomText) }}>Copy Text</button>
                    <button className="boardroom-action-btn" onClick={() => window.print()}>Print / Save PDF</button>
                    <button className="boardroom-action-btn" onClick={generateBoardroom}>Regenerate</button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ── LAUNCH RADAR SVG COMPONENT ──
function LaunchRadar({ products }) {
  const [tooltip, setTooltip] = useState(null)

  const W = 800, H = 520
  const PAD = { left: 60, right: 40, top: 40, bottom: 60 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  // X axis: Fluency Score (0-100), Y axis: Positioning Range (ordinal)
  const rangeOrder = { 'Daily Rituals Series': 1, 'Healthier Treats': 2, 'Artisanal Signatures': 3, 'Inspired Treasures': 4 }
  const rangeLabels = { 'Daily Rituals Series': 'Daily Rituals', 'Healthier Treats': 'Healthier', 'Artisanal Signatures': 'Artisanal', 'Inspired Treasures': 'Inspired' }

  function xPos(score) { return PAD.left + (score / 100) * plotW }
  function yPos(range) {
    const v = rangeOrder[range] || 2
    return PAD.top + plotH - ((v - 0.5) / 4) * plotH
  }

  const bandColors = {
    'Mass Category': '#1a7f4b', 'Sweet Spot': '#2e6dce', 'Bridge Required': '#b5700f',
    'Regional Champion': '#7c4fa0', 'Cultural Discovery': '#c43b1f', 'Hidden Gem': '#6b7280'
  }

  // Quadrant labels
  const quadrants = [
    { x: PAD.left + plotW * 0.75, y: PAD.top + plotH * 0.15, label: 'Launch Now' },
    { x: PAD.left + plotW * 0.15, y: PAD.top + plotH * 0.15, label: 'Premium Build' },
    { x: PAD.left + plotW * 0.75, y: PAD.top + plotH * 0.85, label: 'Volume Driver' },
    { x: PAD.left + plotW * 0.15, y: PAD.top + plotH * 0.85, label: 'Needs Work' },
  ]

  return (
    <div>
      <div style={{position:'relative', width:'100%', paddingBottom:'65%'}}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Background quadrants */}
          <rect x={PAD.left + plotW/2} y={PAD.top} width={plotW/2} height={plotH/2} fill="rgba(46,109,206,0.04)" />
          <rect x={PAD.left} y={PAD.top} width={plotW/2} height={plotH/2} fill="rgba(124,79,160,0.03)" />
          <rect x={PAD.left + plotW/2} y={PAD.top + plotH/2} width={plotW/2} height={plotH/2} fill="rgba(26,127,75,0.04)" />
          <rect x={PAD.left} y={PAD.top + plotH/2} width={plotW/2} height={plotH/2} fill="rgba(196,59,31,0.02)" />

          {/* Grid lines */}
          <line x1={PAD.left + plotW/2} y1={PAD.top} x2={PAD.left + plotW/2} y2={PAD.top + plotH} stroke="#E8D4C0" strokeWidth="1" strokeDasharray="4,4" />
          <line x1={PAD.left} y1={PAD.top + plotH/2} x2={PAD.left + plotW} y2={PAD.top + plotH/2} stroke="#E8D4C0" strokeWidth="1" strokeDasharray="4,4" />

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#C4A898" strokeWidth="1.5" />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#C4A898" strokeWidth="1.5" />

          {/* X axis ticks */}
          {[0,25,50,75,100].map(v => (
            <g key={v}>
              <line x1={xPos(v)} y1={PAD.top+plotH} x2={xPos(v)} y2={PAD.top+plotH+5} stroke="#C4A898" strokeWidth="1" />
              <text x={xPos(v)} y={PAD.top+plotH+18} textAnchor="middle" className="radar-axis-label">{v}</text>
            </g>
          ))}

          {/* Y axis labels */}
          {Object.entries(rangeOrder).map(([range, v]) => (
            <text key={range} x={PAD.left - 8} y={yPos(range) + 4} textAnchor="end" className="radar-axis-label">
              {rangeLabels[range]}
            </text>
          ))}

          {/* Axis titles */}
          <text x={PAD.left + plotW/2} y={H - 8} textAnchor="middle" className="radar-axis-label">← Needs Education · Fluency Score · Ready Now →</text>
          <text x={14} y={PAD.top + plotH/2} textAnchor="middle" className="radar-axis-label" transform={`rotate(-90, 14, ${PAD.top + plotH/2})`}>← Everyday · Positioning · Premium →</text>

          {/* Quadrant labels */}
          {quadrants.map((q,i) => (
            <text key={i} x={q.x} y={q.y} textAnchor="middle" className="radar-quadrant-label">{q.label}</text>
          ))}

          {/* Product dots */}
          {products.map((p, i) => {
            const cx = xPos(p.familiarityScore)
            const cy = yPos(p.positioningRange)
            const col = bandColors[p.fluentBand] || '#999'
            const isSweep = p.fluentBand === 'Sweet Spot'
            return (
              <g key={p.id}
                onMouseEnter={(e) => setTooltip({ product: p, x: cx, y: cy })}
                style={{cursor:'pointer'}}
              >
                {isSweep && <circle cx={cx} cy={cy} r="9" fill={col} opacity="0.15" />}
                <circle cx={cx} cy={cy} r={isSweep ? 6 : 5} fill={col} opacity="0.85" stroke="#fff" strokeWidth="1.5" />
              </g>
            )
          })}

          {/* Tooltip */}
          {tooltip && (() => {
            const tp = tooltip.product
            const bc = BAND_COLOR[tp.fluentBand] || BAND_COLOR['Cultural Discovery']
            const tx = Math.min(tooltip.x + 12, W - 180)
            const ty = Math.max(tooltip.y - 60, 10)
            return (
              <g>
                <rect x={tx} y={ty} width={170} height={70} rx={8} fill="#1A0C06" opacity="0.92" />
                <text x={tx+10} y={ty+18} fill="#FDF6EC" fontSize="13" fontWeight="700" fontFamily="'Cormorant Garamond',serif">{tp.name}</text>
                <text x={tx+10} y={ty+34} fill="rgba(253,246,236,0.6)" fontSize="10">{tp.primaryState} · {tp.category}</text>
                <text x={tx+10} y={ty+50} fill={bc.color} fontSize="11" fontWeight="600">{tp.fluentBand} · {tp.familiarityScore}/100</text>
                <text x={tx+10} y={ty+64} fill="rgba(253,246,236,0.45)" fontSize="10">{tp.positioningRange}</text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:'14px',flexWrap:'wrap',marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #F0E4D4'}}>
        {Object.entries(bandColors).map(([band, col]) => (
          <div key={band} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'#6b5446'}}>
            <div style={{width:'9px',height:'9px',borderRadius:'50%',background:col,flexShrink:0}} />
            {band}
          </div>
        ))}
        <div style={{marginLeft:'auto',fontSize:'11px',color:'#9C7060',fontStyle:'italic'}}>Hover dots for product details</div>
      </div>
    </div>
  )
}
