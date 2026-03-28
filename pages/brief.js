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

function getTopProducts(products, cat) {
  const subset = cat === 'Other'
    ? products.filter(p => !['Sweets','Snacks'].includes(p.category))
    : products.filter(p => p.category === cat)
  return subset
    .sort((a,b) => (BAND_ORDER[a.fluentBand]||9)-(BAND_ORDER[b.fluentBand]||9) || b.familiarityScore-a.familiarityScore)
    .slice(0,5)
}

function parseBoardroom(text) {
  const sections = []
  let current = null
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    const hm = t.match(/^\*\*(.+?)\*\*$/) || t.match(/^#+\s+(.+)$/)
    if (hm) {
      if (current) sections.push(current)
      current = { title: hm[1].replace(/\*\*/g,'').trim(), bullets:[], body:[] }
    } else if (current) {
      if (t.startsWith('- ') || t.startsWith('• ') || t.match(/^\d+\./))
        current.bullets.push(t.replace(/^[-•]\s+/,'').replace(/^\d+\.\s+/,''))
      else current.body.push(t)
    } else { sections.push({ title:'', bullets:[], body:[t] }) }
  }
  if (current) sections.push(current)
  return sections.filter(s => s.title || s.body.length || s.bullets.length)
}

const ICONS = {'SITUATION':'📍','OPPORTUNITY':'🎯','ACTION':'⚡','RISK':'⚠️','BOTTOM':'🏆'}
function getIcon(title) {
  const u = title.toUpperCase()
  for (const [k,v] of Object.entries(ICONS)) if (u.includes(k)) return v
  return '◆'
}

export default function Brief({ products }) {
  const [briefCat, setBriefCat] = useState('Sweets')
  const [sections, setSections] = useState([])
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRefine, setShowRefine] = useState(false)
  const [refineInput, setRefineInput] = useState('')
  const [brandUrl, setBrandUrl] = useState('')
  const [brandContext, setBrandContext] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlStatus, setUrlStatus] = useState('')

  const briefProducts = useMemo(() => getTopProducts(products, briefCat), [products, briefCat])

  async function fetchUrl() {
    if (!brandUrl.trim()) return
    setUrlLoading(true); setUrlStatus('')
    try {
      const r = await fetch('/api/fetch-url', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url:brandUrl.trim()}) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setBrandContext(d.text)
      setUrlStatus('✓ Brand context loaded — AI will use this in all responses')
    } catch(e) { setUrlStatus('⚠ Could not fetch URL. Continuing without brand context.') }
    finally { setUrlLoading(false) }
  }

  async function generate(refine) {
    setLoading(true); setError(''); setSections([]); setRawText(''); setShowRefine(false)
    try {
      const ss = products.filter(p=>p.fluentBand==='Sweet Spot').length
      const mc = products.filter(p=>p.fluentBand==='Mass Category').length
      const rc = products.filter(p=>p.fluentBand==='Regional Champion').length
      const top3 = products.filter(p=>p.fluentBand==='Sweet Spot')
        .sort((a,b)=>b.familiarityScore-a.familiarityScore).slice(0,3)
        .map(p=>`${p.name} (${p.primaryState}, ${p.familiarityScore}/100)`).join(', ')

      const query = `Generate a boardroom briefing using EXACTLY these bold section headers:

**THE SITUATION**
(2 sentences on where the packaged product portfolio stands nationally)

**THE OPPORTUNITY**
(2 sentences on the single biggest packaged product opportunity right now)

**TOP 3 ACTIONS**
- Action 1 (specific, time-bound)
- Action 2
- Action 3

**THE RISK**
(1 sentence on the key risk)

**THE BOTTOM LINE**
(1 powerful sentence — the single most important thing to do this quarter)

Data: ${products.length} total products mapped. Sweet Spot: ${ss}. Mass Category: ${mc}. Regional Champion: ${rc}. Top launch picks: ${top3}. All recommendations must be shelf-stable packaged products.`

      const r = await fetch('/api/advisor', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({query, mode:'boardroom', brandContext, refinePrompt: refine||''}) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setRawText(d.response)
      setSections(parseBoardroom(d.response))
    } catch(e) { setError(e.message||'Generation failed') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Head><title>C-Suite Brief · South or Not</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#FBF3E8;color:#281408;-webkit-font-smoothing:antialiased}
        .bh{background:#1A0C06;padding:36px 0 28px}
        .bhi{max-width:1100px;margin:0 auto;padding:0 32px}
        .bey{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#B5700F;margin-bottom:8px}
        .btit{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,6vw,50px);font-weight:700;color:#FDF6EC;line-height:1}
        .btit span{color:#B83822}
        .bsub{font-size:13px;color:rgba(253,246,236,.4);margin-top:8px}
        .bmain{max-width:1100px;margin:0 auto;padding:28px 32px 80px;display:flex;flex-direction:column;gap:24px}
        .urlbar{background:#fff;border:1px solid #E8D4C0;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .urllabel{font-size:11px;font-weight:700;color:#9C7060;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
        .urlinp{flex:1;min-width:200px;padding:8px 13px;border:1.5px solid #E8D4C0;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;color:#281408;outline:none;background:#FBF3E8}
        .urlinp:focus{border-color:#B83822;background:#fff}
        .urlbtn{padding:8px 16px;background:#1A0C06;color:#FDF6EC;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
        .urlbtn:hover:not(:disabled){background:#B83822}
        .urlbtn:disabled{opacity:.5;cursor:not-allowed}
        .urlst{font-size:12px;color:#2D5A3D;width:100%}
        .urlst.w{color:#B5700F}
        .sec{background:#fff;border:1px solid #E8D4C0;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(26,12,6,.06)}
        .sech{padding:18px 24px 14px;border-bottom:1px solid #F0E4D4;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .sect{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#1A0C06}
        .secs{font-size:11px;color:#9C7060;margin-top:2px}
        .secb{padding:20px 24px}
        .tabrow{display:flex;gap:6px}
        .tab{padding:5px 14px;border-radius:100px;border:1.5px solid #E8D4C0;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#9C7060;cursor:pointer;transition:all .18s}
        .tab.on{border-color:#B83822;background:#F9E8E4;color:#B83822;font-weight:700}
        .plist{display:flex;flex-direction:column;gap:8px}
        .prow{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #F0E4D4;border-radius:10px;transition:background .15s}
        .prow:hover{background:#FBF3E8}
        .prank{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#E8D4C0;min-width:26px}
        .pname{font-size:14px;font-weight:600;color:#1A0C06}
        .pmeta{font-size:11px;color:#9C7060;margin-top:2px}
        .pnote{font-size:11px;color:#6b5446;margin-top:3px;line-height:1.4}
        .pscol{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:44px}
        .psnum{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:800}
        .pbpill{font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px;white-space:nowrap}
        .plink{padding:6px 13px;border-radius:100px;border:1.5px solid #B83822;color:#B83822;font-size:11px;font-weight:600;white-space:nowrap;text-decoration:none;transition:all .18s}
        .plink:hover{background:#B83822;color:#fff}
        .genbtn{display:flex;align-items:center;gap:10px;padding:13px 26px;background:#1A0C06;color:#FDF6EC;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .18s}
        .genbtn:hover:not(:disabled){background:#B83822}
        .genbtn:disabled{opacity:.5;cursor:not-allowed}
        .spin{width:15px;height:15px;border:2px solid rgba(253,246,236,.3);border-top-color:#FDF6EC;border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .berr{color:#B83822;font-size:13px;margin-top:10px;padding:10px 14px;background:#F9E8E4;border-radius:8px}
        .bslide{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .bcard{border-radius:12px;padding:18px 20px;border:1px solid #E8D4C0;background:#fff}
        .bcard.fw{grid-column:1/-1}
        .bcard.hl{background:#1A0C06;border-color:#1A0C06}
        .bcard.risk{background:#FFF8F0;border-color:#F0D4B0}
        .bcicon{font-size:16px;margin-bottom:6px}
        .bctitle{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9C7060;margin-bottom:8px}
        .bcard.hl .bctitle{color:rgba(253,246,236,.45)}
        .bcbody{font-size:14px;color:#281408;line-height:1.65}
        .bcard.hl .bcbody{color:#FDF6EC;font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;line-height:1.5}
        .bcard.risk .bcbody{color:#6B3A2A}
        .bbullet{display:flex;gap:8px;align-items:flex-start;margin-bottom:7px;font-size:13px;color:#281408;line-height:1.55}
        .barrow{color:#B83822;flex-shrink:0;font-weight:700;margin-top:1px}
        .bactions{margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .bab{padding:7px 15px;border-radius:100px;border:1.5px solid #E8D4C0;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#6b5446;cursor:pointer;transition:all .18s}
        .bab:hover{border-color:#B83822;color:#B83822}
        .bab.p{background:#F9E8E4;border-color:#B83822;color:#B83822}
        .refinebox{margin-top:12px;border:1.5px solid #E8D4C0;border-radius:10px;padding:14px 16px;background:#FBF3E8}
        .rlabel{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#9C7060;margin-bottom:8px}
        .rrow{display:flex;gap:8px}
        .rinp{flex:1;padding:9px 13px;border:1.5px solid #E8D4C0;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:#281408;background:#fff;outline:none}
        .rinp:focus{border-color:#B83822}
        .rsub{padding:9px 16px;background:#B83822;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
        .rsub:hover{background:#9E2E15}
        .rsub:disabled{opacity:.5;cursor:not-allowed}
        @media(max-width:700px){.bmain{padding:16px 16px 60px}.bhi{padding:0 16px}.bslide{grid-template-columns:1fr}.bcard.fw{grid-column:1}}
      `}</style>

      <div className="bh"><div className="bhi">
        <div className="bey">South or Not · Executive Intelligence</div>
        <h1 className="btit">C-Suite <span>Brief.</span></h1>
        <p className="bsub">Launch picks and boardroom insights — shelf-stable packaged products only.</p>
      </div></div>

      <div className="bmain">

        {/* URL CONTEXT BAR */}
        <div className="urlbar">
          <span className="urllabel">Brand Website</span>
          <input className="urlinp" type="url" placeholder="https://sweetkaramcoffee.com — paste your brand URL to improve AI responses"
            value={brandUrl} onChange={e=>setBrandUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchUrl()} />
          <button className="urlbtn" onClick={fetchUrl} disabled={urlLoading||!brandUrl.trim()}>
            {urlLoading?'Loading…':'Load Context'}
          </button>
          {urlStatus && <div className={`urlst${urlStatus.startsWith('⚠')?' w':''}`}>{urlStatus}</div>}
        </div>

        {/* WEEKLY BRIEF */}
        <div className="sec">
          <div className="sech">
            <div>
              <div className="sect">Weekly Launch Brief</div>
              <div className="secs">Top 5 shelf-stable packaged products ready for national launch — by launch readiness</div>
            </div>
            <div className="tabrow">
              {['Sweets','Snacks','Other'].map(c=>(
                <button key={c} className={`tab${briefCat===c?' on':''}`} onClick={()=>setBriefCat(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="secb">
            <div className="plist">
              {briefProducts.map((p,i)=>{
                const bc = BAND_COLOR[p.fluentBand]||BAND_COLOR['Cultural Discovery']
                return (
                  <div key={p.id} className="prow">
                    <div className="prank">0{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="pname">{p.name}</div>
                      <div className="pmeta">{p.primaryState} · {p.positioningRange}</div>
                      {p.familiarityNote&&<div className="pnote">{p.familiarityNote.slice(0,90)}{p.familiarityNote.length>90?'…':''}</div>}
                    </div>
                    <div className="pscol">
                      <span className="psnum" style={{color:bc.color}}>{p.familiarityScore}</span>
                      <span className="pbpill" style={{background:bc.bg,color:bc.color}}>{p.fluentBand}</span>
                    </div>
                    <Link href={`/?product=${encodeURIComponent(p.name)}&category=${encodeURIComponent(p.category)}`} className="plink">
                      Analyse →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* BOARDROOM BRIEFING */}
        <div className="sec">
          <div className="sech">
            <div>
              <div className="sect">Boardroom Briefing</div>
              <div className="secs">AI executive summary from your full packaged product portfolio · ~10 seconds</div>
            </div>
          </div>
          <div className="secb">
            <button className="genbtn" onClick={()=>generate('')} disabled={loading}>
              {loading?<><div className="spin"/>Generating briefing…</>:<>✦ {sections.length?'Regenerate':'Generate'} Boardroom Briefing</>}
            </button>

            {error&&<div className="berr">⚠ {error}</div>}

            {sections.length>0&&<>
              <div className="bslide">
                {sections.map((s,i)=>{
                  const icon = getIcon(s.title)
                  const isBL = s.title.toUpperCase().includes('BOTTOM')
                  const isR = s.title.toUpperCase().includes('RISK')
                  return (
                    <div key={i} className={`bcard${isBL?' hl fw':isR?' risk':''}`}>
                      <div className="bcicon">{icon}</div>
                      <div className="bctitle">{s.title}</div>
                      <div className="bcbody">
                        {s.body.map((l,j)=><p key={j} style={{marginBottom:j<s.body.length-1?'8px':0}}>{l}</p>)}
                        {s.bullets.map((b,j)=>(
                          <div key={j} className="bbullet"><span className="barrow">→</span><span>{b}</span></div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bactions">
                <button className="bab p" onClick={()=>setShowRefine(r=>!r)}>✏ Refine Brief</button>
                <button className="bab" onClick={()=>navigator.clipboard.writeText(rawText)}>Copy Text</button>
                <button className="bab" onClick={()=>window.print()}>Save as PDF</button>
                <button className="bab" onClick={()=>generate('')}>Regenerate</button>
              </div>

              {showRefine&&(
                <div className="refinebox">
                  <div className="rlabel">Refine this briefing</div>
                  <div className="rrow">
                    <input className="rinp" placeholder="e.g. Focus on Tamil Nadu only · Make actions more aggressive · Add Diwali gifting angle…"
                      value={refineInput} onChange={e=>setRefineInput(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&refineInput.trim()&&generate(refineInput)} />
                    <button className="rsub" onClick={()=>generate(refineInput)} disabled={!refineInput.trim()||loading}>Apply</button>
                  </div>
                </div>
              )}
            </>}
          </div>
        </div>

      </div>
    </>
  )
}
