import { NavLink, Outlet } from 'react-router-dom'
import { messages } from './i18n/pt-BR.messages'

const navItems = [
  { to: '/biblioteca', label: messages.nav.biblioteca },
  { to: '/meia-vida', label: messages.nav.meiaVida },
  { to: '/reconstituir', label: messages.nav.reconstituir },
  { to: '/protocolos', label: messages.nav.protocolos },
  { to: '/historico', label: messages.nav.historico },
  { to: '/ajustes', label: messages.nav.ajustes },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">{messages.appName}</span>
        <nav className="app-nav" aria-label={messages.navLabel}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link--active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
