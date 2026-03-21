import { useState, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { readFileSync } from 'fs'
import path from 'path'

// ─── getStaticProps loads the DB at build time ───────────────────────
export async function getStaticProps() {
  const products = JSON.parse(
    readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8')
  )
  return { props: { products } }
}

// ─── Filter configuration ────────────────────────────────────────────
const STATE_OPTIONS = [
  { value: 'all', label: 'All States' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Telangana', label: 'Telangana' },
]

const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'south_famous', label: 'South Famous' },
  { value: 'south_hyperregional', label: 'South Hyperregional' },
  { value: 'non_south', label: 'Non-South (with SI Proxy)' },
  { value: 'western', label: 'Western' },
]

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'Sweets', label: 'Sweets' },
  { value: 'Snacks', label: 'Snacks' },
  { value: 'Milk Mix / Beverages', label: 'Beverages' },
  { value: 'Food Items', label: 'Food Items' },
]

const RANGE_OPTIONS = [
  { value: 'all', label: 'All Ranges' },
  { value: 'Daily Rituals Series', label: 'Daily Rituals' },
  { value: 'Healthier Treats', label: 'Healthier Treats' },
  { value: 'Artisanal Signatures', label: 'Artisanal Signatures' },
  { value: 'Inspired Treasures', label: 'Inspired Treasures' },
]

const TIER_META = {
  south_famous: { label: 'South Famous', color: '#2D5A3D', bg: '#E0EDE4' },
  south_hyperregional: { label: 'Hyperregional', color: '#1565C0', bg: '#E3F2FD' },
  non_south: { label: 'Non-South', color: '#C43B1F', bg: '#FBE9E7' },
  western: { label: 'Western', color: '#6A1B9A', bg: '#F3E5F5' },
}

const RANGE_META = {
  'Daily Rituals Series': { short: 'Daily', color: '#6B3A2A' },
  'Healthier Treats': { short: 'Healthier', color: '#2D5A3D' },
  'Artisanal Signatures': { short: 'Artisanal', color: '#8B0000' },
  'Inspired Treasures': { short: 'Inspired', color: '#4A148C' },
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function Explore({ products }) {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [rangeFilter, setRangeFilter] = useState('all')
  const [sort, setSort] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.aliases || []).some(a => a.toLowerCase().includes(q)) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (p.region || '').toLowerCase().includes(q)
      )
    }

    if (stateFilter !== 'all') {
      result = result.filter(p =>
        p.primaryState === stateFilter ||
        (p.states || []).includes(stateFilter)
      )
    }

    if (tierFilter !== 'all') result = result.filter(p => p.tier === tierFilter)
    if (categoryFilter !== 'all') result = result.filter(p => p.category === categoryFilter)
    if (rangeFilter !== 'all') result = result.filter(p => p.positioningRange === rangeFilter)

    result.sort((a, b) => {
      let av, bv
      if (sort === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
      else if (sort === 'state') { av = a.primaryState || ''; bv = b.primaryState || '' }
      else if (sort === 'category') { av = a.category || ''; bv = b.category || '' }
      else if (sort === 'range') { av = a.positioningRange || ''; bv = b.positioningRange || '' }
      else if (sort === 'familiarity') {
        return sortDir === 'asc'
          ? (a.familiarityScore || 0) - (b.familiarityScore || 0)
          : (b.familiarityScore || 0) - (a.familiarityScore || 0)
      }
      else { av = a.tier || ''; bv = b.tier || '' }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return result
  }, [products, search, stateFilter, tierFilter, categoryFilter, rangeFilter, sort, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(col) {
    if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(col); setSortDir('asc') }
    setPage(1)
  }

  function resetFilters() {
    setSearch(''); setStateFilter('all'); setTierFilter('all')
    setCategoryFilter('all'); setRangeFilter('all'); setPage(1)
  }

  const hasFilters = search || stateFilter !== 'all' || tierFilter !== 'all' || categoryFilter !== 'all' || rangeFilter !== 'all'

  // Stats
  const stats = useMemo(() => ({
    total: products.length,
    southFamous: products.filter(p => p.tier === 'south_famous').length,
    hyperregional: products.filter(p => p.tier === 'south_hyperregional').length,
    nonSouth: products.filter(p => p.tier === 'non_south').length,
    western: products.filter(p => p.tier === 'western').length,
  }), [products])

  return (
    <>
      <Head>
        <title>Explore · South or Not · Sweet Karam Coffee</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FDF6EC; --cream-dark: #F5E8D4; --primary: #C43B1F;
          --primary-dark: #9E2E14; --primary-light: #F5DDD8;
          --green: #2D5A3D; --green-light: #E0EDE4; --gold: #C47A1A;
          --gold-light: #FAF0DC; --dark: #1A0E08; --dark-mid: #3D2414;
          --text: #2C1810; --text-mid: #6B4E3D; --text-light: #A08070;
          --border: #E8D5C4; --border-light: #F2E8DE;
          --card: #FFFFFF; --radius: 12px; --radius-sm: 8px;
        }
        body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); -webkit-font-smoothing: antialiased; }
        .app { min-height: 100vh; background-image: radial-gradient(circle, rgba(196,59,31,0.05) 1px, transparent 1px); background-size: 28px 28px; }

        /* HEADER */
        .header { position: relative; background: var(--dark); overflow: hidden; padding: 40px 0 32px; }
        .header::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(196,59,31,0.2) 0%, transparent 60%); pointer-events: none; }
        .header-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 0 32px; display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .header-left {}
        .brand-tag { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }
        .header-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px, 6vw, 60px); font-weight: 700; color: #FDF6EC; line-height: 1; letter-spacing: -0.02em; }
        .header-dot { color: var(--primary); }
        .header-sub { margin-top: 6px; font-size: 13px; color: rgba(253,246,236,0.45); }
        .header-nav { display: flex; gap: 8px; align-items: center; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 500; text-decoration: none; color: rgba(253,246,236,0.6); border: 1px solid rgba(255,255,255,0.1); transition: all 0.18s; }
        .nav-link:hover, .nav-link.active { color: #FDF6EC; border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); }

        /* STATS STRIP */
        .stats-strip { background: var(--dark-mid); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0; }
        .stats-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; display: flex; gap: 0; }
        .stat-item { padding: 14px 24px; border-right: 1px solid rgba(255,255,255,0.06); flex: 1; min-width: 0; }
        .stat-item:first-child { padding-left: 0; }
        .stat-num { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; color: #FDF6EC; line-height: 1; }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(253,246,236,0.4); margin-top: 2px; }

        /* MAIN */
        .main { max-width: 1200px; margin: 0 auto; padding: 32px; }

        /* SEARCH + FILTERS */
        .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
        .search-wrap { position: relative; flex: 1; min-width: 240px; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--text-light); pointer-events: none; }
        .search-input { width: 100%; padding: 11px 16px 11px 38px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--card); font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text); outline: none; transition: border-color 0.18s; }
        .search-input:focus { border-color: var(--primary); }
        .search-input::placeholder { color: var(--text-light); }
        .filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
        .filter-select { padding: 8px 12px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--card); font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text); outline: none; cursor: pointer; transition: border-color 0.18s; }
        .filter-select:focus { border-color: var(--primary); }
        .filter-select.active { border-color: var(--primary); background: var(--primary-light); color: var(--primary-dark); }
        .reset-btn { padding: 8px 14px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: transparent; color: var(--text-light); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.18s; }
        .reset-btn:hover { border-color: var(--primary); color: var(--primary); }
        .result-count { font-size: 13px; color: var(--text-light); margin-left: auto; white-space: nowrap; }

        /* TABLE */
        .table-wrap { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border-light); overflow: hidden; box-shadow: 0 2px 12px rgba(28,14,8,0.07); }
        .table { width: 100%; border-collapse: collapse; }
        .th { padding: 13px 16px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(253,246,236,0.6); background: var(--dark); white-space: nowrap; cursor: pointer; user-select: none; transition: background 0.15s; }
        .th:hover { background: var(--dark-mid); color: rgba(253,246,236,0.8); }
        .th.sorted { color: var(--gold); }
        .sort-arrow { margin-left: 4px; opacity: 0.6; }
        .tr { border-bottom: 1px solid var(--border-light); transition: background 0.12s; }
        .tr:last-child { border-bottom: none; }
        .tr:hover { background: var(--cream); }
        .td { padding: 13px 16px; font-size: 14px; color: var(--text); vertical-align: middle; }

        /* BADGES */
        .tier-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap; }
        .range-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; flex-shrink: 0; }
        .state-text { font-size: 13px; color: var(--text-mid); }
        .product-name-cell { font-weight: 600; color: var(--dark); }
        .product-aliases { font-size: 11px; color: var(--text-light); margin-top: 2px; }
        .product-led-flags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
        .micro-flag { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 100px; }
        .flag-pl { background: rgba(45,90,61,0.1); color: var(--green); }
        .flag-fl { background: rgba(196,122,26,0.1); color: var(--gold); }

        .analyze-btn { padding: 6px 14px; border-radius: 100px; border: 1.5px solid var(--primary); background: transparent; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap; text-decoration: none; display: inline-block; }
        .analyze-btn:hover { background: var(--primary); color: #fff; }

        /* PAGINATION */
        .pagination { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 20px 0 0; flex-wrap: wrap; }
        .page-btn { padding: 7px 13px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--card); font-size: 13px; font-weight: 500; color: var(--text-mid); cursor: pointer; transition: all 0.18s; min-width: 38px; text-align: center; }
        .page-btn:hover:not(.active):not(:disabled) { border-color: var(--primary); color: var(--primary); }
        .page-btn.active { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
        .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .page-info { font-size: 13px; color: var(--text-light); padding: 0 8px; }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(26,14,8,0.7); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal { background: var(--cream); border-radius: var(--radius); max-width: 560px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: slideUp 0.25s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-header { padding: 24px 28px 0; display: flex; justify-content: space-between; align-items: flex-start; }
        .modal-header h2 { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: var(--dark); }
        .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--border); color: var(--text-mid); font-size: 16px; cursor: pointer; transition: all 0.15s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-left: 12px; }
        .modal-close:hover { background: var(--primary); color: #fff; }
        .modal-body { padding: 20px 28px 28px; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .modal-item { padding: 14px; background: var(--card); border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
        .modal-item-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-light); margin-bottom: 5px; }
        .modal-item-value { font-size: 14px; color: var(--text); line-height: 1.4; }
        .modal-item-value.bold { font-weight: 700; color: var(--dark); }
        .modal-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
        .modal-tag { padding: 4px 10px; border-radius: 100px; background: var(--cream-dark); border: 1px solid var(--border); font-size: 12px; color: var(--text-mid); }
        .modal-cta { display: flex; gap: 10px; flex-wrap: wrap; }
        .modal-analyze-btn { flex: 1; padding: 12px 20px; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; display: block; transition: all 0.18s; }
        .modal-analyze-btn:hover { background: var(--primary-dark); }
        .modal-secondary { flex: 1; padding: 12px 20px; background: transparent; color: var(--text-mid); border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; text-align: center; }
        .modal-secondary:hover { border-color: var(--primary); color: var(--primary); }

        /* EMPTY STATE */
        .empty-state { padding: 60px 32px; text-align: center; }
        .empty-icon { font-size: 40px; margin-bottom: 16px; }
        .empty-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 700; color: var(--dark); margin-bottom: 8px; }
        .empty-sub { font-size: 14px; color: var(--text-light); margin-bottom: 20px; }

        @media (max-width: 768px) {
          .stats-inner { overflow-x: auto; }
          .stat-item { min-width: 100px; }
          .td:nth-child(3), .td:nth-child(5) { display: none; }
          .th:nth-child(3), .th:nth-child(5) { display: none; }
          .main { padding: 16px; }
          .modal-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="app">
        {/* HEADER */}
        <header className="header">
          <div className="header-inner">
            <div className="header-left">
              <span className="brand-tag">Sweet Karam Coffee — Product Intelligence</span>
              <h1 className="header-title">
                Explore<span className="header-dot">.</span>
              </h1>
              <p className="header-sub">Browse {products.length} products · Filter by state, category, tier, and range</p>
            </div>

          </div>
        </header>

        {/* STATS STRIP */}
        <div className="stats-strip">
          <div className="stats-inner">
            <div className="stat-item">
              <div className="stat-num">{stats.total}</div>
              <div className="stat-label">Total Products</div>
            </div>
            <div className="stat-item">
              <div className="stat-num" style={{color:'#A5D6A7'}}>{stats.southFamous}</div>
              <div className="stat-label">South Famous</div>
            </div>
            <div className="stat-item">
              <div className="stat-num" style={{color:'#90CAF9'}}>{stats.hyperregional}</div>
              <div className="stat-label">Hyperregional</div>
            </div>
            <div className="stat-item">
              <div className="stat-num" style={{color:'#EF9A9A'}}>{stats.nonSouth}</div>
              <div className="stat-label">Non-South w/ Proxy</div>
            </div>
            <div className="stat-item" style={{borderRight:'none'}}>
              <div className="stat-num" style={{color:'#CE93D8'}}>{stats.western}</div>
              <div className="stat-label">Western</div>
            </div>
          </div>
        </div>

        <main className="main">
          {/* TOOLBAR */}
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search products, aliases, tags, regions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>

          <div className="filter-row">
            <select
              className={`filter-select ${stateFilter !== 'all' ? 'active' : ''}`}
              value={stateFilter}
              onChange={e => { setStateFilter(e.target.value); setPage(1) }}
            >
              {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className={`filter-select ${tierFilter !== 'all' ? 'active' : ''}`}
              value={tierFilter}
              onChange={e => { setTierFilter(e.target.value); setPage(1) }}
            >
              {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className={`filter-select ${categoryFilter !== 'all' ? 'active' : ''}`}
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
            >
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className={`filter-select ${rangeFilter !== 'all' ? 'active' : ''}`}
              value={rangeFilter}
              onChange={e => { setRangeFilter(e.target.value); setPage(1) }}
            >
              {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {hasFilters && (
              <button className="reset-btn" onClick={resetFilters}>✕ Reset</button>
            )}

            <span className="result-count">
              {filtered.length} of {products.length} products
            </span>
          </div>

          {/* TABLE */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No products found</div>
              <p className="empty-sub">Try different filters or a broader search term</p>
              <button className="reset-btn" onClick={resetFilters}>Reset all filters</button>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className={`th ${sort === 'name' ? 'sorted' : ''}`} onClick={() => handleSort('name')}>
                        Product {sort === 'name' && <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                      <th className={`th ${sort === 'tier' ? 'sorted' : ''}`} onClick={() => handleSort('tier')}>
                        SI Status {sort === 'tier' && <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                      <th className={`th ${sort === 'state' ? 'sorted' : ''}`} onClick={() => handleSort('state')}>
                        State {sort === 'state' && <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                      <th className={`th ${sort === 'category' ? 'sorted' : ''}`} onClick={() => handleSort('category')}>
                        Category {sort === 'category' && <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                      <th className={`th ${sort === 'range' ? 'sorted' : ''}`} onClick={() => handleSort('range')}>
                        Brand Range {sort === 'range' && <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                      <th className={`th ${sort === 'familiarity' ? 'sorted' : ''}`} onClick={() => handleSort('familiarity')}>
                        Fluency {sort === 'familiarity' && <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                      <th className="th" style={{width:'80px'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(product => {
                      const tierInfo = TIER_META[product.tier] || TIER_META.south_famous
                      const rangeInfo = RANGE_META[product.positioningRange] || { short: product.positioningRange, color: '#666' }
                      return (
                        <tr
                          key={product.id}
                          className="tr"
                          style={{cursor:'pointer'}}
                          onClick={() => setSelectedProduct(product)}
                        >
                          <td className="td">
                            <div className="product-name-cell">{product.name}</div>
                            {product.aliases?.length > 0 && (
                              <div className="product-aliases">
                                {product.aliases.slice(0,3).join(' · ')}
                              </div>
                            )}
                            <div className="product-led-flags">
                              {product.productLed && <span className="micro-flag flag-pl">Product-Led</span>}
                              {product.flavorLed && <span className="micro-flag flag-fl">Flavor-Led</span>}
                            </div>
                          </td>
                          <td className="td">
                            <span
                              className="tier-badge"
                              style={{background: tierInfo.bg, color: tierInfo.color}}
                            >
                              {tierInfo.label}
                            </span>
                          </td>
                          <td className="td">
                            <span className="state-text">
                              {product.primaryState || '—'}
                            </span>
                            {product.region && product.region !== product.primaryState && (
                              <div style={{fontSize:'11px', color:'var(--text-light)', marginTop:'2px'}}>
                                {product.region.length > 30 ? product.region.slice(0,30)+'…' : product.region}
                              </div>
                            )}
                          </td>
                          <td className="td" style={{color:'var(--text-mid)', fontSize:'13px'}}>
                            {product.category}
                          </td>
                          <td className="td">
                            <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color: rangeInfo.color, fontWeight:500}}>
                              <span
                                className="range-dot"
                                style={{background: rangeInfo.color}}
                              />
                              {rangeInfo.short}
                            </div>
                          </td>
                          <td className="td">
                            {(() => {
                              const score = product.familiarityScore || 0
                              const band = product.fluentBand || 'Cultural Discovery'
                              const bandColors = {
                                'Mass Category': { color:'#1a7f4b', bg:'#e6f7ef' },
                                'Sweet Spot': { color:'#2e6dce', bg:'#e8f0fb' },
                                'Bridge Required': { color:'#b5700f', bg:'#fdf3e3' },
                                'Regional Champion': { color:'#7c4fa0', bg:'#f4ecfb' },
                                'Cultural Discovery': { color:'#c43b1f', bg:'#fdecea' },
                                'Hidden Gem': { color:'#6b7280', bg:'#f3f4f6' },
                              }
                              const bc = bandColors[band] || bandColors['Cultural Discovery']
                              return (
                                <div>
                                  <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px'}}>
                                    <span style={{fontFamily:'Cormorant Garamond, serif', fontWeight:800, fontSize:'17px', color: bc.color}}>{score}</span>
                                    <span style={{fontSize:'10px', color:'var(--text-muted)'}}>/100</span>
                                  </div>
                                  <div style={{width:'80px', height:'5px', borderRadius:'3px', background:'#f3f4f6', overflow:'hidden', marginBottom:'4px'}}>
                                    <div style={{height:'100%', width:`${score}%`, background: bc.color, borderRadius:'3px'}} />
                                  </div>
                                  <span style={{fontSize:'10px', fontWeight:600, color: bc.color, background: bc.bg, padding:'2px 7px', borderRadius:'100px', whiteSpace:'nowrap'}}>
                                    {band}
                                  </span>
                                </div>
                              )
                            })()}
                          </td>
                          <td className="td" onClick={e => e.stopPropagation()}>
                            <Link
                              href={`/?product=${encodeURIComponent(product.name)}&category=${encodeURIComponent(product.category)}`}
                              className="analyze-btn"
                            >
                              Analyze →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >←</button>

                  {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
                    let pageNum
                    if (totalPages <= 7) {
                      pageNum = i + 1
                    } else if (page <= 4) {
                      pageNum = i + 1
                      if (i === 6) pageNum = totalPages
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    } else {
                      const nums = [1, page-1, page, page+1, totalPages]
                      pageNum = nums[i] || null
                    }
                    if (!pageNum) return null
                    return (
                      <button
                        key={pageNum}
                        className={`page-btn ${page === pageNum ? 'active' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <span className="page-info">of {totalPages}</span>

                  <button
                    className="page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >→</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:'4px'}}>
                  {selectedProduct.category}
                </div>
                <h2>{selectedProduct.name}</h2>
              </div>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-item">
                  <div className="modal-item-label">SI Status</div>
                  <div className="modal-item-value bold" style={{color: TIER_META[selectedProduct.tier]?.color}}>
                    {selectedProduct.southIndianStatus}
                  </div>
                </div>
                <div className="modal-item">
                  <div className="modal-item-label">Primary State</div>
                  <div className="modal-item-value bold">{selectedProduct.primaryState}</div>
                </div>
                <div className="modal-item">
                  <div className="modal-item-label">Region</div>
                  <div className="modal-item-value">{selectedProduct.region || 'Pan South India'}</div>
                </div>
                <div className="modal-item">
                  <div className="modal-item-label">Brand Range</div>
                  <div className="modal-item-value" style={{color: RANGE_META[selectedProduct.positioningRange]?.color, fontWeight:600}}>
                    {selectedProduct.positioningRange}
                  </div>
                </div>
                <div className="modal-item" style={{gridColumn:'1/-1', background: (() => { const b={'Mass Category':'#e6f7ef','Sweet Spot':'#e8f0fb','Bridge Required':'#fdf3e3','Regional Champion':'#f4ecfb','Cultural Discovery':'#fdecea','Hidden Gem':'#f3f4f6'}; return b[selectedProduct.fluentBand]||'#f9fafb' })()}}>
                  <div className="modal-item-label">Familiarity Score — {selectedProduct.fluentBand}</div>
                  <div style={{display:'flex', alignItems:'center', gap:'12px', marginTop:'4px'}}>
                    <span style={{fontFamily:'Cormorant Garamond,serif', fontWeight:800, fontSize:'28px', color: (() => {const c={'Mass Category':'#1a7f4b','Sweet Spot':'#2e6dce','Bridge Required':'#b5700f','Regional Champion':'#7c4fa0','Cultural Discovery':'#c43b1f','Hidden Gem':'#6b7280'}; return c[selectedProduct.fluentBand]||'#666'})()}}>{selectedProduct.familiarityScore}</span>
                    <div style={{flex:1}}>
                      <div style={{height:'8px', borderRadius:'4px', background:'#e5e7eb', overflow:'hidden', marginBottom:'4px'}}>
                        <div style={{height:'100%', width:`${selectedProduct.familiarityScore}%`, background: (() => {const c={'Mass Category':'#1a7f4b','Sweet Spot':'#2e6dce','Bridge Required':'#b5700f','Regional Champion':'#7c4fa0','Cultural Discovery':'#c43b1f','Hidden Gem':'#6b7280'}; return c[selectedProduct.fluentBand]||'#666'})()} } />
                      </div>
                      <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{selectedProduct.familiarityNote}</div>
                    </div>
                  </div>
                </div>
                {selectedProduct.festivals?.length > 0 && (
                  <div className="modal-item" style={{gridColumn:'1/-1'}}>
                    <div className="modal-item-label">Festivals & Seasons</div>
                    <div className="modal-item-value">{selectedProduct.festivals.join(', ')}</div>
                  </div>
                )}
                {selectedProduct.proxyOf && (
                  <div className="modal-item" style={{gridColumn:'1/-1', background:'var(--primary-light)', borderColor:'rgba(196,59,31,0.2)'}}>
                    <div className="modal-item-label" style={{color:'var(--primary)'}}>South Indian Proxy</div>
                    <div className="modal-item-value bold" style={{color:'var(--primary-dark)'}}>
                      {selectedProduct.proxyOf} ({selectedProduct.proxyState})
                    </div>
                  </div>
                )}
              </div>

              {/* Flags */}
              <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                {selectedProduct.productLed && (
                  <span style={{padding:'4px 12px',borderRadius:'100px',background:'var(--green-light)',color:'var(--green)',fontSize:'12px',fontWeight:600}}>
                    Product-Led ✓
                  </span>
                )}
                {selectedProduct.flavorLed && (
                  <span style={{padding:'4px 12px',borderRadius:'100px',background:'var(--gold-light)',color:'var(--gold)',fontSize:'12px',fontWeight:600}}>
                    Flavor-Led ✓
                  </span>
                )}
              </div>

              {/* Ingredients preview */}
              {selectedProduct.ingredients?.length > 0 && (
                <div style={{marginBottom:'16px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:'8px'}}>
                    Key Ingredients
                  </div>
                  <div className="modal-tags">
                    {selectedProduct.ingredients.slice(0, 8).map((ing, i) => (
                      <span key={i} className="modal-tag">{ing}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedProduct.tags?.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:'8px'}}>
                    Tags
                  </div>
                  <div className="modal-tags">
                    {selectedProduct.tags.map((tag, i) => (
                      <span key={i} className="modal-tag" style={{background:'var(--gold-light)',color:'var(--gold)',borderColor:'rgba(196,122,26,0.15)'}}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-cta">
                <Link
                  href={`/?product=${encodeURIComponent(selectedProduct.name)}&category=${encodeURIComponent(selectedProduct.category)}`}
                  className="modal-analyze-btn"
                >
                  Run Full Analysis →
                </Link>
                <button className="modal-secondary" onClick={() => setSelectedProduct(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
