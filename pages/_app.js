import '../styles/globals.css'
import Link from 'next/link'
import { useRouter } from 'next/router'

const NAV_LINKS = [
  { href: '/',        label: 'South or Not' },
  { href: '/explore', label: 'Explore' },
  { href: '/advisor', label: 'Advisor' },
  { href: '/flavors', label: 'Flavors' },
]

function GlobalNav() {
  const router = useRouter()
  return (
    <nav className="skc-nav">
      <div className="skc-nav-inner">
        <Link href="/" className="skc-nav-brand" style={{display:'flex',flexDirection:'column',alignItems:'flex-start',lineHeight:1.15,textDecoration:'none'}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'17px',fontWeight:700,color:'#FDF6EC'}}>South or Not<span style={{color:'#B83822'}}>.</span></span>
          <span style={{fontSize:'9px',fontWeight:400,letterSpacing:'0.07em',color:'rgba(253,246,236,0.38)',textTransform:'uppercase',marginTop:'1px'}}>South Indian Food Intelligence · by Sooraj Ram</span>
        </Link>
        <div className="skc-nav-sep" />
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`skc-nav-link ${router.pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <GlobalNav />
      <Component {...pageProps} />
    </>
  )
}
