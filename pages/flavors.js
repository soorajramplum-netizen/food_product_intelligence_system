import { useState, useMemo, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { readFileSync } from 'fs'
import path from 'path'

export async function getStaticProps() {
  const flavors = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'flavors.json'), 'utf8'))
  const products = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8'))
  return { props: { flavors, products } }
}

const FLAVOR_CLASS_META = {
  'Classic':                { color: '#4B5563', bg: '#F3F4F6' },
  'Spicy':                  { color: '#B91C1C', bg: '#FEE2E2' },
  'Sweet & Spicy':          { color: '#D97706', bg: '#FEF3C7' },
  'South Indian / Unique':  { color: '#2D5A3D', bg: '#E0EDE4' },
  'Tangy':                  { color: '#0369A1', bg: '#E0F2FE' },
  'Garlic':                 { color: '#7C3AED', bg: '#EDE9FE' },
  'Fiery Spicy':            { color: '#9F1239', bg: '#FFE4E6' },
  'Sweet & Sour':           { color: '#C47A1A', bg: '#FAF0DC' },
  'Western Flavors':        { color: '#6A1B9A', bg: '#F3E5F5' },
  'Fusion Flavors':         { color: '#0F766E', bg: '#CCFBF1' },
  'Sweet':                  { color: '#BE185D', bg: '#FCE7F3' },
}

const BEST_SUITED_OPTIONS = [
  'Chips',
  'South Indian Traditional Snacks',
  'Snacks',
  'Mixture',
  'Murukku',
  'Sweets',
  'Beverage / Milk Mix',
]

// Keep TYPE_META for backward compat
const TYPE_META = {
  south_indian: { label: 'South Indian', color: '#2D5A3D', bg: '#E0EDE4' },
  generic:      { label: 'Generic',       color: '#1565C0', bg: '#E3F2FD' },
  western:      { label: 'Western',       color: '#6A1B9A', bg: '#F3E5F5' },
  food_based:   { label: 'Food-Based',    color: '#C47A1A', bg: '#FAF0DC' },
  fusion:       { label: 'Fusion',        color: '#0F766E', bg: '#CCFBF1' },
}

const INTENSITY_ORDER = { 'Very Strong': 4, 'Strong': 3, 'Medium': 2, 'Mild': 1, 'Complex': 3 }

export default function Flavors({ flavors, products }) {
  const [classFilter, setClassFilter] = useState('all')
  const [suitedFilter, setSuitedFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedFlavor, setSelectedFlavor] = useState(null)
  const [aiQuery, setAiQuery] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [activeTab, setActiveTab] = useState('browse') // 'browse' | 'pairing'
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 40
  const aiResultRef = useRef(null)

  useEffect(() => { if (aiResult && aiResultRef.current) aiResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [aiResult])

  const filtered = useMemo(() => {
    let result = [...flavors]
    if (classFilter !== 'all') result = result.filter(f => f.flavorClass === classFilter)
    if (suitedFilter !== 'all') result = result.filter(f => f.bestSuitedFor === suitedFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (f.aliases || []).some(a => a.toLowerCase().includes(q)) ||
        (f.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (Array.isArray(f.profile) ? f.profile.join(' ') : (f.profile || '')).toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      let av, bv
      if (sort === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      else if (sort === 'type') { av = a.type; bv = b.type }
      else if (sort === 'intensity') { av = INTENSITY_ORDER[b.intensity] || 0; bv = INTENSITY_ORDER[a.intensity] || 0; return sortDir === 'asc' ? av - bv : bv - av }
      else { av = a.category || ''; bv = b.category || '' }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return result
  }, [flavors, classFilter, suitedFilter, search, sort, sortDir])

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function handleSort(col) {
    if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(col); setSortDir('asc') }
    setPage(1)
  }

  async function handleAiSearch() {
    if (!aiQuery.trim() || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)

    try {
      const res = await fetch('/api/flavor-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, flavors, products })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Request failed')
      }
      const data = await res.json()
      setAiResult(data)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const stats = useMemo(() => {
    const counts = {}
    Object.keys(TYPE_META).forEach(t => counts[t] = flavors.filter(f => f.type === t).length)
    return counts
  }, [flavors])

  return (
    <>
      <Head>
        <title>Flavor Library · South or Not · Sweet Karam Coffee</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FDF6EC; --cream-dark: #F5E8D4; --primary: #C43B1F;
          --green: #2D5A3D; --gold: #C47A1A; --dark: #1A0E08;
          --dark-mid: #3D2414; --text: #2C1810; --text-mid: #6B4E3D;
          --text-light: #A08070; --border: #E8D5C4; --border-light: #F2E8DE;
          --card: #FFFFFF; --radius: 12px; --radius-sm: 8px;
        }
        body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); -webkit-font-smoothing: antialiased; }
        .app { min-height: 100vh; background-image: radial-gradient(circle, rgba(196,59,31,0.05) 1px, transparent 1px); background-size: 28px 28px; }

        .header { position: relative; background: var(--dark); overflow: hidden; padding: 40px 0 32px; }
        .header::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(196,59,31,0.2) 0%, transparent 60%); }
        .header-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 0 32px; display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .brand-tag { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }
        .header-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px, 6vw, 60px); font-weight: 700; color: #FDF6EC; line-height: 1; letter-spacing: -0.02em; }
        .header-dot { color: var(--primary); }
        .header-sub { margin-top: 6px; font-size: 13px; color: rgba(253,246,236,0.45); }
        .header-nav { display: flex; gap: 8px; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 500; text-decoration: none; color: rgba(253,246,236,0.6); border: 1px solid rgba(255,255,255,0.1); transition: all 0.18s; }
        .nav-link:hover, .nav-link.active { color: #FDF6EC; border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); }

        .stats-strip { background: var(--dark-mid); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .stats-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; display: flex; }
        .stat-item { padding: 14px 24px; border-right: 1px solid rgba(255,255,255,0.06); flex: 1; min-width: 0; }
        .stat-item:first-child { padding-left: 0; }
        .stat-num { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; color: #FDF6EC; line-height: 1; }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(253,246,236,0.4); margin-top: 2px; }

        .main { max-width: 1200px; margin: 0 auto; padding: 32px; }

        /* TABS */
        .tabs { display: flex; gap: 4px; background: var(--card); border-radius: var(--radius); border: 1px solid var(--border-light); padding: 4px; margin-bottom: 28px; width: fit-content; }
        .tab-btn { padding: 10px 24px; border: none; border-radius: calc(var(--radius) - 4px); background: transparent; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--text-mid); cursor: pointer; transition: all 0.18s; }
        .tab-btn.active { background: var(--primary); color: #fff; font-weight: 600; }
        .tab-btn:hover:not(.active) { background: var(--cream-dark); }

        /* BROWSE */
        .toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
        .search-wrap { position: relative; flex: 1; min-width: 200px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--text-light); pointer-events: none; }
        .search-input { width: 100%; padding: 10px 14px 10px 34px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--card); font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); outline: none; transition: border-color 0.18s; }
        .search-input:focus { border-color: var(--primary); }
        .filter-select { padding: 8px 12px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--card); font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text); outline: none; cursor: pointer; transition: border-color 0.18s; }
        .filter-select.active { border-color: var(--primary); background: #FBE9E7; color: var(--primary); }
        .result-count { font-size: 13px; color: var(--text-light); margin-left: auto; white-space: nowrap; }

        /* FLAVOR GRID */
        .flavor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .flavor-card { padding: 18px; border-radius: var(--radius); border: 1px solid var(--border-light); background: var(--card); cursor: pointer; transition: all 0.18s; position: relative; overflow: hidden; }
        .flavor-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; transition: all 0.18s; }
        .flavor-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(28,14,8,0.1); }
        .flavor-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
        .flavor-name { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 700; color: var(--dark); line-height: 1.2; padding-right: 8px; }
        .type-badge { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 8px; border-radius: 100px; white-space: nowrap; }
        .flavor-profile { font-size: 12px; color: var(--text-mid); margin-bottom: 8px; line-height: 1.4; font-style: italic; }
        .flavor-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .intensity-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .intensity-text { font-size: 11px; color: var(--text-light); font-weight: 500; }
        .flavor-category { font-size: 11px; color: var(--text-light); }
        .flavor-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
        .flavor-tag { font-size: 10px; padding: 2px 7px; border-radius: 100px; background: var(--cream-dark); color: var(--text-mid); }

        /* PAGINATION */
        .pagination { display: flex; justify-content: center; gap: 6px; padding: 24px 0 0; flex-wrap: wrap; }
        .page-btn { padding: 7px 13px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--card); font-size: 13px; font-weight: 500; color: var(--text-mid); cursor: pointer; min-width: 38px; text-align: center; transition: all 0.18s; }
        .page-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .page-btn:hover:not(.active):not(:disabled) { border-color: var(--primary); color: var(--primary); }

        /* INTENSITY COLORS */
        .int-very-strong { background: #C43B1F; }
        .int-strong { background: #C47A1A; }
        .int-medium { background: #2D5A3D; }
        .int-mild { background: #90A4AE; }
        .int-complex { background: #6A1B9A; }

        /* AI PAIRING */
        .pairing-intro { max-width: 640px; margin-bottom: 28px; }
        .pairing-intro h2 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: var(--dark); margin-bottom: 8px; }
        .pairing-intro p { font-size: 15px; color: var(--text-mid); line-height: 1.6; }
        .pairing-examples { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .example-chip { padding: 6px 14px; border-radius: 100px; border: 1.5px solid var(--border); background: var(--card); font-size: 12px; font-weight: 500; color: var(--text-mid); cursor: pointer; transition: all 0.18s; }
        .example-chip:hover { border-color: var(--primary); color: var(--primary); }
        .ai-search-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .ai-input { flex: 1; padding: 14px 18px; border-radius: var(--radius); border: 2px solid var(--border); background: var(--card); font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--text); outline: none; transition: border-color 0.18s; }
        .ai-input:focus { border-color: var(--primary); }
        .ai-input::placeholder { color: var(--text-light); }
        .ai-search-btn { padding: 14px 24px; border: none; border-radius: var(--radius); background: var(--primary); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .ai-search-btn:hover:not(:disabled) { background: #9E2E14; }
        .ai-search-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .ai-result { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border-light); padding: 28px; box-shadow: 0 2px 12px rgba(28,14,8,0.07); animation: fadeUp 0.3s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .ai-result-query { font-size: 13px; color: var(--text-light); font-style: italic; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border-light); }

        /* PAIRING CARDS */
        .pairing-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .pairing-card { padding: 20px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--cream); }
        .pairing-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
        .pairing-flavor-name { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--dark); }
        .pairing-why { font-size: 13px; color: var(--text-mid); line-height: 1.6; margin-bottom: 12px; }
        .pairing-products { display: flex; flex-direction: column; gap: 6px; }
        .pairing-product { padding: 8px 12px; background: var(--card); border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
        .pairing-product-name { font-size: 13px; font-weight: 600; color: var(--dark); }
        .pairing-product-angle { font-size: 11px; color: var(--text-light); margin-top: 2px; line-height: 1.4; }
        .pairing-notes { padding: 16px 20px; background: var(--gold-light); border-radius: var(--radius-sm); border: 1px solid rgba(196,122,26,0.2); font-size: 13px; color: var(--dark-mid); line-height: 1.6; }

        /* FLAVOR MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(26,14,8,0.7); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal { background: var(--card); border-radius: var(--radius); max-width: 520px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .modal-header { padding: 24px 28px 0; display: flex; justify-content: space-between; align-items: flex-start; }
        .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: var(--dark); }
        .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--border); color: var(--text-mid); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; margin-left: 12px; }
        .modal-close:hover { background: var(--primary); color: #fff; }
        .modal-body { padding: 20px 28px 28px; }
        .modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .modal-item { padding: 12px; background: var(--cream); border-radius: var(--radius-sm); }
        .modal-item-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-light); margin-bottom: 4px; }
        .modal-item-value { font-size: 14px; color: var(--text); line-height: 1.4; }
        .modal-aliases { margin-bottom: 16px; }
        .alias-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .alias-chip { padding: 3px 10px; border-radius: 100px; background: var(--cream-dark); font-size: 12px; color: var(--text-mid); }
        .modal-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .modal-tag { padding: 3px 10px; border-radius: 100px; font-size: 11px; }

        @media (max-width: 768px) {
          .main { padding: 16px; }
          .ai-search-row { flex-direction: column; }
          .pairing-cards { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="app">
        <header className="header">
          <div className="header-inner">
            <div>
              <span className="brand-tag">Sweet Karam Coffee — Product Intelligence</span>
              <h1 className="header-title">Flavors<span className="header-dot">.</span></h1>
              <p className="header-sub">{flavors.length} flavors · {Object.keys(FLAVOR_CLASS_META).length} flavor classes · AI-powered pairing search</p>
            </div>

          </div>
        </header>

        <div className="stats-strip">
          <div className="stats-inner">
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <div key={key} className="stat-item">
                <div className="stat-num" style={{color: meta.color === '#2D5A3D' ? '#A5D6A7' : meta.color === '#1565C0' ? '#90CAF9' : meta.color === '#6A1B9A' ? '#CE93D8' : '#FFCC80'}}>
                  {stats[key]}
                </div>
                <div className="stat-label">{meta.label}</div>
              </div>
            ))}
            <div className="stat-item" style={{borderRight:'none'}}>
              <div className="stat-num" style={{color:'#FDF6EC'}}>{flavors.length}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
        </div>

        <main className="main">
          {/* TABS */}
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
              🗂 Browse Library
            </button>
            <button className={`tab-btn ${activeTab === 'pairing' ? 'active' : ''}`} onClick={() => setActiveTab('pairing')}>
              ✦ AI Pairing Search
            </button>
          </div>

          {/* BROWSE TAB */}
          {activeTab === 'browse' && (
            <>
              <div className="toolbar">
                <div className="search-wrap">
                  <span className="search-icon">⌕</span>
                  <input className="search-input" type="text" placeholder="Search flavors, profiles, aliases, tags…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                </div>
                <select className={`filter-select ${classFilter !== 'all' ? 'active' : ''}`} value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1) }}>
                  <option value="all">All Flavor Types</option>
                  {Object.keys(FLAVOR_CLASS_META).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select className={`filter-select ${suitedFilter !== 'all' ? 'active' : ''}`} value={suitedFilter} onChange={e => { setSuitedFilter(e.target.value); setPage(1) }}>
                  <option value="all">Best Suited For</option>
                  {BEST_SUITED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="result-count">{filtered.length} of {flavors.length}</span>
              </div>

              <div className="flavor-grid">
                {paginated.map(flavor => {
                  const meta = TYPE_META[flavor.type] || TYPE_META.generic
                  return (
                    <div
                      key={flavor.id}
                      className="flavor-card"
                      style={{ '--card-color': (FLAVOR_CLASS_META[flavor.flavorClass]||meta).color }}
                      onClick={() => setSelectedFlavor(flavor)}
                    >
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background: (FLAVOR_CLASS_META[flavor.flavorClass]||meta).color, borderRadius:'12px 0 0 12px' }} />
                      <div className="flavor-top">
                        <div className="flavor-name">{flavor.name}</div>
                        <span className="type-badge" style={{ background: (FLAVOR_CLASS_META[flavor.flavorClass]||{}).bg||'#f3f4f6', color: (FLAVOR_CLASS_META[flavor.flavorClass]||{}).color||'#666' }}>{flavor.flavorClass || flavor.type}</span>
                      </div>
                      <div className="flavor-profile">{Array.isArray(flavor.profile) ? flavor.profile.join(', ') : flavor.profile}</div>
                      <div className="flavor-meta">
                        <span className="flavor-category" style={{fontSize:'11px',color:'var(--text-muted)',fontWeight:600}}>{flavor.bestSuitedFor || flavor.category}</span>
                      </div>
                      <div className="flavor-tags">
                        {(flavor.tags || []).slice(0,4).map((t,i) => (
                          <span key={i} className="flavor-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>←</button>
                  {Array.from({length: Math.min(totalPages,7)}, (_,i) => i+1).map(n => (
                    <button key={n} className={`page-btn ${page===n?'active':''}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  {totalPages > 7 && <span style={{padding:'0 8px',color:'var(--text-light)',fontSize:'13px'}}>…{totalPages}</span>}
                  <button className="page-btn" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>→</button>
                </div>
              )}
            </>
          )}

          {/* AI PAIRING TAB */}
          {activeTab === 'pairing' && (
            <>
              <div className="pairing-intro">
                <h2>AI Flavor Pairing Search</h2>
                <p>Ask anything about flavor pairings, South Indian combinations, or innovation angles. The AI knows the full flavor and product library.</p>
              </div>

              <div className="pairing-examples">
                {[
                  'What South Indian flavors work for a Holi product?',
                  'Pair palm jaggery with 3 base products',
                  'Best flavor for a premium Diwali gift sweet',
                  'What South Indian flavors can I use in a cookie?',
                  'Give me 5 underused South Indian flavors for snack innovation',
                ].map((ex, i) => (
                  <button key={i} className="example-chip" onClick={() => setAiQuery(ex)}>{ex}</button>
                ))}
              </div>

              <div className="ai-search-row">
                <input
                  className="ai-input"
                  type="text"
                  placeholder="e.g. What South Indian flavors pair well with dark chocolate for a premium gifting product?"
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                />
                <button className="ai-search-btn" onClick={handleAiSearch} disabled={!aiQuery.trim() || aiLoading}>
                  {aiLoading ? '…' : 'Search →'}
                </button>
              </div>

              {aiError && <div style={{padding:'12px 16px',background:'#FBE9E7',border:'1px solid #E57373',borderRadius:'8px',color:'#C62828',fontSize:'14px',marginBottom:'16px'}}>⚠ {aiError}</div>}

              {aiLoading && (
                <div style={{textAlign:'center',padding:'40px'}}>
                  <div style={{width:'40px',height:'40px',border:'3px solid var(--border)',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}} />
                  <div style={{fontSize:'14px',color:'var(--text-mid)'}}>Searching flavor pairings…</div>
                </div>
              )}

              {aiResult && (
                <div className="ai-result" ref={aiResultRef}>
                  <div className="ai-result-query">"{aiQuery}"</div>
                  {aiResult.pairings && (
                    <div className="pairing-cards">
                      {aiResult.pairings.map((p, i) => {
                        const meta = TYPE_META[p.flavorType] || TYPE_META.generic
                        return (
                          <div key={i} className="pairing-card">
                            <div className="pairing-card-header">
                              <div className="pairing-flavor-name">{p.flavorName}</div>
                              <span className="type-badge" style={{background:meta.bg,color:meta.color,padding:'3px 10px',borderRadius:'100px',fontSize:'11px',fontWeight:700}}>{meta.label}</span>
                            </div>
                            <div className="pairing-why">{p.why}</div>
                            {p.products?.length > 0 && (
                              <div className="pairing-products">
                                {p.products.map((prod, j) => (
                                  <div key={j} className="pairing-product">
                                    <div className="pairing-product-name">{prod.product}</div>
                                    <div className="pairing-product-angle">{prod.angle}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {aiResult.notes && (
                    <div className="pairing-notes">💡 {aiResult.notes}</div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* FLAVOR MODAL */}
      {selectedFlavor && (
        <div className="modal-overlay" onClick={() => setSelectedFlavor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedFlavor.name}</h2>
              <button className="modal-close" onClick={() => setSelectedFlavor(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-row">
                <div className="modal-item">
                  <div className="modal-item-label">Type</div>
                  <div className="modal-item-value" style={{color: (FLAVOR_CLASS_META[selectedFlavor.flavorClass]||{}).color||'#666', fontWeight:600}}>{selectedFlavor.flavorClass}</div>
                </div>
                <div className="modal-item">
                  <div className="modal-item-label">Best Suited For</div>
                  <div className="modal-item-value">{selectedFlavor.bestSuitedFor}</div>
                </div>
                <div className="modal-item">
                  <div className="modal-item-label">Category</div>
                  <div className="modal-item-value">{selectedFlavor.category}</div>
                </div>
                <div className="modal-item">
                  <div className="modal-item-label">Food Base</div>
                  <div className="modal-item-value">{selectedFlavor.foodBase ? 'Yes' : 'No'}</div>
                </div>
              </div>
              <div className="modal-item" style={{marginBottom:'16px'}}>
                <div className="modal-item-label">Flavor Profile</div>
                <div className="modal-item-value" style={{fontStyle:'italic',fontSize:'15px',color:'var(--dark-mid)'}}>{selectedFlavor.profile}</div>
              </div>
              {selectedFlavor.aliases?.length > 0 && (
                <div className="modal-aliases">
                  <div className="modal-item-label" style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:'6px'}}>Also known as</div>
                  <div className="alias-chips">
                    {selectedFlavor.aliases.map((a,i) => <span key={i} className="alias-chip">{a}</span>)}
                  </div>
                </div>
              )}
              <div>
                <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:'6px'}}>Tags</div>
                <div className="modal-tags">
                  {selectedFlavor.tags?.map((t,i) => (
                    <span key={i} className="modal-tag" style={{background: TYPE_META[selectedFlavor.type]?.bg, color: TYPE_META[selectedFlavor.type]?.color}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
