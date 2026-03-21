import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const MODES = [
  {
    id: 'launch',
    label: 'Product Launch',
    icon: '🚀',
    short: 'Launch Suggestion',
    description: 'Get South Indian product ideas for any brief, occasion, or trend',
    placeholder: 'e.g. "I want to launch something special for Holi as a South Indian brand. What should I do?" or "What South Indian snack should I launch for the gym-going millennial?"',
    color: '#C43B1F',
    bg: '#FBE9E7',
    systemContext: `You are the product innovation lead at Sweet Karam Coffee (sweetkaramcoffee.in), a premium South Indian Sweets & Snacks D2C brand from Chennai. Your expertise is finding South Indian products, stories, and launch angles that are authentic, culturally rooted, and commercially exciting.

When someone brings you a brief, you:
1. Identify which South Indian products (from the 5 states: Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana) fit the brief
2. Give a clear RECOMMENDATION first — one primary product idea with strong rationale
3. Then give 2-3 alternative angles
4. For each idea: product name, why it's South Indian, best state/region story, how to position it for the occasion/audience
5. Flag if something is NOT South Indian and suggest what a South Indian brand should do instead
6. Reference real festivals, seasons, cultural moments where relevant
7. Be opinionated — this is an internal strategy conversation, not a generic AI answer

Format your response with clear headers. Be concise and commercially sharp. No fluff.`
  },
  {
    id: 'positioning',
    label: 'Positioning',
    icon: '🎯',
    short: 'Positioning Advice',
    description: 'How to position a specific product — brand range, messaging, audience',
    placeholder: 'e.g. "How should I position Jackfruit Chips differently from regular banana chips?" or "We have a Filter Coffee Ladoo — where does it sit on our brand ladder and who do we sell it to?"',
    color: '#2D5A3D',
    bg: '#E0EDE4',
    systemContext: `You are the brand positioning strategist at Sweet Karam Coffee (sweetkaramcoffee.in), a premium South Indian Sweets & Snacks D2C brand. You know the brand's four-tier ladder:
- Daily Rituals Series: everyday, tea-time, familiar, approachable
- Healthier Treats: functional, nutrition-forward, guilt-free
- Artisanal Signatures: craft, heritage, provenance, small-batch
- Inspired Treasures: innovation, fusion, premium gifting

When someone asks about positioning a product, you:
1. Assign it to the right Brand Ladder Range with clear reasoning
2. Define the core audience (be specific — "urban South Indian woman, 28-40, in Bangalore/Chennai/Hyderabad" not "health-conscious consumers")
3. Give the ONE most important functional benefit and ONE most important emotional benefit
4. Suggest a differentiating angle vs competitors
5. Flag any positioning risks or misconceptions to avoid
6. Apply Sutherland/Shotton thinking: what's the psycho-logical angle, not just the logical one?

Be direct and opinionated. This is an internal brand team conversation.`
  },
  {
    id: 'functional',
    label: 'Functional Benefits',
    icon: '⚗️',
    short: 'Functional Advice',
    description: 'What health claims can I make? What functional story can this product own?',
    placeholder: 'e.g. "What functional benefits can I claim for Ragi Ladoo?" or "I want to make protein claims for our Pesarattu Mix — what is valid and what is risky?"',
    color: '#C47A1A',
    bg: '#FAF0DC',
    systemContext: `You are the functional nutrition and product claims advisor at Sweet Karam Coffee (sweetkaramcoffee.in). You understand both food science and FSSAI regulations in India. You help the team identify which functional claims are valid, credible, and legally safe for their South Indian products.

When someone asks about functional benefits, you:
1. List specific, valid functional callouts with the exact ingredient that supports each claim
2. Give packaging-ready badge text (e.g. "6g Protein per 30g" not just "high protein")
3. Distinguish between strong claims (ingredient has clear RDA contribution), moderate claims (reasonable but needs care), and risky claims (avoid unless FSSAI-approved)
4. Flag what NOT to claim and why
5. Suggest the best 2-3 claims to lead with for maximum consumer relevance
6. Reference South Indian ingredient traditions (Ayurveda, traditional use) as supporting narrative for functional claims

Be specific with numbers where possible. Be honest about what is credible vs what is greenwashing.`
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    icon: '✍️',
    short: 'Storytelling',
    description: 'Write packaging copy, brand narratives, product stories',
    placeholder: 'e.g. "Write packaging copy for our Tirunelveli Wheat Halwa" or "I need a product story for Kozhikode Halwa that connects with non-South Indians" or "Write 3 versions of a tagline for our Murukku"',
    color: '#4A148C',
    bg: '#F3E5F5',
    systemContext: `You are the chief copywriter and brand storyteller at Sweet Karam Coffee (sweetkaramcoffee.in), a premium South Indian Sweets & Snacks D2C brand. Your writing style is warm, specific, sensory, and rooted in genuine cultural knowledge. You write like a great food journalist who also happens to know marketing.

When someone asks for copy or storytelling, you:
1. Deliver the requested copy first — don't explain what you're going to write, just write it
2. Write multiple versions (at least 2-3 options) unless asked for just one
3. Apply specific behavioral science principles in the copy without naming them explicitly:
   - Effort Heuristic: communicate process, time, craft
   - Geographical Descriptor: use specific place names (Tirunelveli, Chettinad, Kozhikode)
   - Loss Aversion: frame what's missed without this product
   - Expectancy Theory: name ingredients and processes specifically
4. Be sensory: sounds, smells, textures, temperatures, occasions
5. Be culturally honest — don't exoticize, don't oversimplify
6. Suggest which version works best for which medium (packaging, website, Instagram, gifting insert)

Write like someone who cares deeply about both the culture and the brand.`
  }
]

export default function Advisor() {
  const [activeMode, setActiveMode] = useState(null)
  const [input, setInput] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const responseRef = useRef(null)

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [response])

  async function handleSubmit() {
    if (!activeMode || !input.trim() || loading) return
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: activeMode.id, query: input.trim(), systemContext: activeMode.systemContext })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Request failed')
      }
      const data = await res.json()
      setResponse(data.response)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setActiveMode(null)
    setInput('')
    setResponse(null)
    setError(null)
  }

  const selectedMode = activeMode

  return (
    <>
      <Head>
        <title>Advisor · South or Not · Sweet Karam Coffee</title>
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
        .header-inner { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 0 32px; display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .brand-tag { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; }
        .header-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(36px, 6vw, 60px); font-weight: 700; color: #FDF6EC; line-height: 1; letter-spacing: -0.02em; }
        .header-dot { color: var(--primary); }
        .header-sub { margin-top: 6px; font-size: 13px; color: rgba(253,246,236,0.45); }
        .header-nav { display: flex; gap: 8px; }
        .nav-link { padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 500; text-decoration: none; color: rgba(253,246,236,0.6); border: 1px solid rgba(255,255,255,0.1); transition: all 0.18s; }
        .nav-link:hover, .nav-link.active { color: #FDF6EC; border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); }

        .main { max-width: 900px; margin: 0 auto; padding: 40px 32px 80px; }

        /* MODE SELECTION */
        .mode-intro { margin-bottom: 32px; }
        .mode-intro h2 { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: var(--dark); margin-bottom: 8px; }
        .mode-intro p { font-size: 15px; color: var(--text-mid); }
        .mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
        .mode-card { padding: 24px; border-radius: var(--radius); border: 2px solid var(--border-light); background: var(--card); cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .mode-card::before { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.2s; }
        .mode-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(28,14,8,0.1); }
        .mode-card.selected { border-width: 2px; }
        .mode-icon { font-size: 28px; margin-bottom: 12px; display: block; }
        .mode-label { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: var(--dark); margin-bottom: 6px; }
        .mode-desc { font-size: 13px; color: var(--text-mid); line-height: 1.5; }

        /* QUERY INPUT */
        .query-section { margin-bottom: 24px; }
        .query-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .mode-indicator { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 600; }
        .mode-change { font-size: 12px; font-weight: 500; color: var(--text-light); cursor: pointer; text-decoration: underline; }
        .mode-change:hover { color: var(--primary); }
        .query-textarea { width: 100%; padding: 16px 18px; border-radius: var(--radius); border: 2px solid var(--border); background: var(--card); font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--text); outline: none; resize: none; line-height: 1.7; transition: border-color 0.18s; }
        .query-textarea:focus { border-color: var(--primary); }
        .query-textarea::placeholder { color: var(--text-light); }
        .submit-btn { width: 100%; padding: 16px; border: none; border-radius: var(--radius-sm); font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* RESPONSE */
        .response-wrap { animation: fadeUp 0.4s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .response-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .response-mode-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .new-query-btn { padding: 9px 18px; border-radius: 100px; border: 1.5px solid var(--border); background: var(--card); color: var(--text-mid); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.18s; }
        .new-query-btn:hover { border-color: var(--primary); color: var(--primary); }
        .response-card { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border-light); padding: 32px; box-shadow: 0 2px 12px rgba(28,14,8,0.07); }
        .response-query { font-size: 13px; color: var(--text-light); margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light); line-height: 1.5; font-style: italic; }
        .response-body { font-size: 15px; color: var(--text); line-height: 1.85; white-space: pre-wrap; }
        .response-body h1,.response-body h2,.response-body h3 { font-family: 'Cormorant Garamond', serif; font-weight: 700; color: var(--dark); margin: 24px 0 10px; line-height: 1.2; }
        .response-body h1 { font-size: 28px; }
        .response-body h2 { font-size: 22px; }
        .response-body h3 { font-size: 18px; }
        .response-body p { margin-bottom: 14px; }
        .response-body ul,.response-body ol { padding-left: 20px; margin-bottom: 14px; }
        .response-body li { margin-bottom: 6px; }
        .response-body strong { font-weight: 700; color: var(--dark); }
        .response-body em { font-style: italic; color: var(--text-mid); }
        .response-body hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

        /* LOADING */
        .loading-wrap { text-align: center; padding: 40px; }
        .spinner-lg { width: 48px; height: 48px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-mode { font-size: 16px; font-weight: 600; color: var(--dark); margin-bottom: 6px; }
        .loading-sub { font-size: 13px; color: var(--text-light); }

        .error-msg { padding: 14px 18px; background: #FBE9E7; border: 1px solid #E57373; border-radius: var(--radius-sm); color: #C62828; font-size: 14px; margin-bottom: 16px; }

        @media (max-width: 600px) {
          .mode-grid { grid-template-columns: 1fr; }
          .main { padding: 24px 16px 60px; }
        }
      `}</style>

      <div className="app">
        <header className="header">
          <div className="header-inner">
            <div>
              <span className="brand-tag">Sweet Karam Coffee — Product Intelligence</span>
              <h1 className="header-title">Advisor<span className="header-dot">.</span></h1>
              <p className="header-sub">Strategic advice across 4 modes — launch, positioning, functional, storytelling</p>
            </div>
            <nav className="header-nav">
              <Link href="/" className="nav-link">South or Not</Link>
              <Link href="/explore" className="nav-link">Explore</Link>
              <Link href="/advisor" className="nav-link active">Advisor</Link>
              <Link href="/flavors" className="nav-link">Flavors</Link>
            </nav>
          </div>
        </header>

        <main className="main">
          {/* STEP 1: Mode selection */}
          {!selectedMode && (
            <>
              <div className="mode-intro">
                <h2>What do you need advice on?</h2>
                <p>Pick a mode — the Advisor will adapt its persona and thinking to match.</p>
              </div>
              <div className="mode-grid">
                {MODES.map(mode => (
                  <div
                    key={mode.id}
                    className="mode-card"
                    style={{ borderColor: mode.color + '40' }}
                    onClick={() => setActiveMode(mode)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = mode.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = mode.color + '40'}
                  >
                    <span className="mode-icon">{mode.icon}</span>
                    <div className="mode-label">{mode.label}</div>
                    <div className="mode-desc">{mode.description}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* STEP 2: Query input */}
          {selectedMode && !response && !loading && (
            <div className="query-section">
              <div className="query-header">
                <span
                  className="mode-indicator"
                  style={{ background: selectedMode.bg, color: selectedMode.color }}
                >
                  {selectedMode.icon} {selectedMode.short}
                </span>
                <span className="mode-change" onClick={reset}>← Change mode</span>
              </div>
              <textarea
                className="query-textarea"
                rows={5}
                placeholder={selectedMode.placeholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit() }}
                autoFocus
              />
              {error && <div className="error-msg">⚠ {error}</div>}
              <button
                className="submit-btn"
                style={{ background: selectedMode.color, color: '#fff', marginTop: '12px' }}
                onClick={handleSubmit}
                disabled={!input.trim()}
              >
                Get {selectedMode.short} →
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-wrap">
              <div className="spinner-lg" />
              <div className="loading-mode">{selectedMode?.icon} {selectedMode?.short}</div>
              <div className="loading-sub">Thinking through your question…</div>
            </div>
          )}

          {/* Response */}
          {response && selectedMode && (
            <div className="response-wrap" ref={responseRef}>
              <div className="response-header">
                <span
                  className="response-mode-badge"
                  style={{ background: selectedMode.bg, color: selectedMode.color }}
                >
                  {selectedMode.icon} {selectedMode.short}
                </span>
                <button className="new-query-btn" onClick={reset}>← New Question</button>
              </div>
              <div className="response-card">
                <div className="response-query">"{input}"</div>
                <MarkdownResponse content={response} />
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// Simple markdown-to-HTML renderer
function MarkdownResponse({ content }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul]|<p|<hr)(.+)$/gm, '<p>$1</p>')

  return (
    <div
      className="response-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
