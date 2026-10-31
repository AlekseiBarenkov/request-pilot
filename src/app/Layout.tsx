import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { ModeBadge } from '../components/ModeBadge'
import { useConfig } from '../data/hooks/useConfig'

export function Layout() {
  const { status, config } = useConfig()
  const location = useLocation()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        К содержимому
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <Link className="app-brand" to="/" aria-label="RequestPilot, на главную">
            <span className="app-brand__mark" aria-hidden="true" />
            RequestPilot
          </Link>

          <nav className="app-nav" aria-label="Основная навигация">
            <NavLink className={navLinkClass} to="/" end>
              Обработка
            </NavLink>
            <NavLink className={navLinkClass} to="/history">
              История
            </NavLink>
          </nav>

          <div className="app-header__mode">
            {status === 'ready' && config ? <ModeBadge provider={config.provider} /> : null}
            {status === 'loading' ? <span className="mode-badge mode-badge--loading">Проверка режима</span> : null}
            {status === 'error' ? <span className="mode-badge mode-badge--offline">Сервер недоступен</span> : null}
          </div>
        </div>
      </header>

      <div className="app-content" ref={contentRef}>
        <main className="app-main" id="main-content">
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <div className="app-footer__inner">Демо-проект. Данные вымышлены.</div>
      </footer>
    </div>
  )
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
}
