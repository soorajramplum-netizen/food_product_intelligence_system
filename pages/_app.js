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
        <Link href="/" className="skc-nav-brand">
          Sweet Karam <span>Coffee</span>
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
