import './App.css'
import { useEffect, useState, useSyncExternalStore } from 'react'
import MainPage from './pages/mainPage/MainPage'
import AboutPage from './pages/aboutPage/AboutPage'
import PortalTeamPage from './pages/aboutPage/PortalTeamPage'
import LoginPage from './pages/loginPage/LoginPage'
import PasswordRecoveryPage from './pages/loginPage/PasswordRecoveryPage'
import ContactUsPage from './pages/contactUs/ContactUs'
import CalendarPage from './pages/calendarPage/CalendarPage'
import AdminArea from './pages/adminArea/AdminArea'
import EventPage from './pages/eventPage/EventPage'
import AccountPage from './pages/accountPage/AccountPage'
import PricingCalculatorPage from './pages/pricingCalculatorPage/PricingCalculatorPage'
import ProducersPage from './pages/producersPage/ProducersPage'
import type { AdminSection } from './components/AdminSideNav/AdminSideNav'
import { getAdminSection } from './services/adminNavigation'
import { getAccountReturnTarget, type AccountReturnTarget } from './services/profileNavigation'
import { AUTH_STATE_CHANGE_EVENT, dismissAdminAccessIssue, getAdminAccessIssue } from './services/authToken'
import AdminDisabledPage from './pages/loginPage/AdminDisabledPage'
import { useAdminSessionMonitor } from './hooks/useAdminSessionMonitor'
import { getCurrentPath, installNavigation, navigate, subscribeNavigation } from './services/navigation'

const subscribeAuthState = (onChange: () => void) => {
  window.addEventListener(AUTH_STATE_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(AUTH_STATE_CHANGE_EVENT, onChange)
}

type AppRoute =
  | { page: 'home' | 'login' | 'contact' | 'calendar' | 'calculator' | 'producers' | 'about' | 'portal-team' }
  | { page: 'admin'; section: AdminSection }
  | { page: 'account'; returnTarget: AccountReturnTarget }
  | { page: 'event'; eventId: string }
  | { page: 'forgot-password' }
  | { page: 'reset-password'; token: string }

const pageTitles: Record<AppRoute['page'], string> = {
  about: 'Sobre nós',
  'portal-team': 'Quem fez o portal',
  home: 'Início',
  login: 'Entrar na área administrativa',
  'forgot-password': 'Recuperar senha',
  'reset-password': 'Redefinir senha',
  admin: 'Área administrativa',
  contact: 'Fale conosco',
  calendar: 'Calendário de feiras',
  account: 'Minha conta',
  calculator: 'Calculadora de precificação',
  producers: 'Produtores',
  event: 'Detalhes do evento',
}

function getCurrentRoute(path: string): AppRoute {
  const [pathname, search = ''] = path.split('?')
  const query = new URLSearchParams(search)

  if (pathname === '/admin/login') return { page: 'login' }
  if (pathname === '/admin/esqueci-minha-senha') return { page: 'forgot-password' }
  if (pathname === '/admin/redefinir-senha') {
    return { page: 'reset-password', token: query.get('token') || '' }
  }
  if (pathname === '/minha-conta') {
    return { page: 'account', returnTarget: getAccountReturnTarget(query.get('origem')) }
  }
  if (pathname === '/admin' || /^\/admin\/(?:dashboard|eventos|informacoes|administradores|mensagens)$/.test(pathname)) {
    return { page: 'admin', section: getAdminSection(path) }
  }
  if (pathname === '/sobre/equipe') return { page: 'portal-team' }
  if (pathname === '/sobre') return { page: 'about' }
  if (pathname === '/produtores') return { page: 'producers' }
  if (pathname === '/contato') return { page: 'contact' }
  if (pathname === '/calendario') return { page: 'calendar' }
  if (pathname === '/calculadora') return { page: 'calculator' }

  const eventRoute = /^\/evento\/([^/?#]+)$/.exec(pathname)
  if (eventRoute) {
    try {
      return { page: 'event', eventId: decodeURIComponent(eventRoute[1]) }
    } catch {
      return { page: 'home' }
    }
  }

  return { page: 'home' }
}

function App() {
  const [path, setPath] = useState(getCurrentPath)
  const route = getCurrentRoute(path)
  const accessIssue = useSyncExternalStore(subscribeAuthState, getAdminAccessIssue)
  const protectedPage = route.page === 'admin' || route.page === 'account'
  const showAccessNotice = Boolean(accessIssue) && (protectedPage || route.page === 'login')
  useAdminSessionMonitor(protectedPage && !accessIssue)

  useEffect(() => {
    const unsubscribe = subscribeNavigation(() => setPath(getCurrentPath()))
    const uninstall = installNavigation()
    return () => { unsubscribe(); uninstall() }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  useEffect(() => {
    document.title = `${showAccessNotice ? 'Acesso administrativo indisponível' : pageTitles[route.page]} | Brotando Feiras`
  }, [route.page, showAccessNotice])

  if (showAccessNotice && accessIssue) return <AdminDisabledPage reason={accessIssue} onReturnToLogin={() => {
    navigate('/admin/login')
    dismissAdminAccessIssue()
  }} />

  if (route.page === 'login') {
    return <LoginPage onLoginSuccess={() => { navigate('/admin') }} />
  }

  if (route.page === 'admin') {
    return <AdminArea activeSection={route.section} />
  }

  if (route.page === 'forgot-password') return <PasswordRecoveryPage key="request" mode="request" />
  if (route.page === 'reset-password') return <PasswordRecoveryPage key={route.token} mode="reset" token={route.token} />

  if (route.page === 'account') return <AccountPage returnTarget={route.returnTarget} />
  if (route.page === 'portal-team') return <PortalTeamPage />
  if (route.page === 'about') return <AboutPage />
  if (route.page === 'calculator') return <PricingCalculatorPage />
  if (route.page === 'producers') return <ProducersPage />

  if (route.page === 'contact') {
    return <ContactUsPage />
  }

  if (route.page === 'calendar') {
    return <CalendarPage />
  }

  if (route.page === 'event') {
    return <EventPage key={route.eventId} eventId={route.eventId} />
  }

  return <MainPage />
}

export default App
