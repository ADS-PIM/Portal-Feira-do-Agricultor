import './App.css'
import { useEffect, useState, useSyncExternalStore } from 'react'
import MainPage from './pages/mainPage/MainPage'
import LoginPage from './pages/loginPage/LoginPage'
import PasswordRecoveryPage from './pages/loginPage/PasswordRecoveryPage'
import ContactUsPage from './pages/contactUs/ContactUs'
import CalendarPage from './pages/calendarPage/CalendarPage'
import AdminArea from './pages/adminArea/AdminArea'
import EventPage from './pages/eventPage/EventPage'
import AccountPage from './pages/accountPage/AccountPage'
import PricingCalculatorPage from './pages/pricingCalculatorPage/PricingCalculatorPage'
import ProducersPage from './pages/producersPage/ProducersPage'
import ProducerProfilePage from './pages/producersPage/ProducerProfilePage'
import type { AdminSection } from './components/AdminSideNav/AdminSideNav'
import { getAdminSection } from './services/adminNavigation'
import { getAccountReturnTarget, type AccountReturnTarget } from './services/profileNavigation'
import { AUTH_STATE_CHANGE_EVENT, dismissAdminAccessIssue, getAdminAccessIssue } from './services/authToken'
import AdminDisabledPage from './pages/loginPage/AdminDisabledPage'
import { useAdminSessionMonitor } from './hooks/useAdminSessionMonitor'

const subscribeAuthState = (onChange: () => void) => {
  window.addEventListener(AUTH_STATE_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(AUTH_STATE_CHANGE_EVENT, onChange)
}

type AppRoute =
  | { page: 'home' | 'login' | 'contact' | 'calendar' | 'calculator' | 'producers' }
  | { page: 'admin'; section: AdminSection }
  | { page: 'account'; returnTarget: AccountReturnTarget }
  | { page: 'producer'; producerSlug: string }
  | { page: 'event'; eventId: string }
  | { page: 'forgot-password' }
  | { page: 'reset-password'; token: string }

const pageTitles: Record<AppRoute['page'], string> = {
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
  producer: 'Perfil do produtor',
  event: 'Detalhes do evento',
}

function getCurrentRoute(): AppRoute {
  const hash = (window.location.hash || '#inicio').replace(/\/+$/, '')

  if (hash === '#/admin/login') return { page: 'login' }
  if (hash === '#/admin/esqueci-minha-senha') return { page: 'forgot-password' }
  if (hash.split('?')[0] === '#/admin/redefinir-senha') {
    const query = new URLSearchParams(hash.split('?')[1] || '')
    return { page: 'reset-password', token: query.get('token') || '' }
  }
  if (hash.split('?')[0] === '#/minha-conta') {
    const query = new URLSearchParams(hash.slice(hash.indexOf('?') + 1))
    return { page: 'account', returnTarget: getAccountReturnTarget(query.get('origem')) }
  }
  if (hash.split('?')[0] === '#/admin') return { page: 'admin', section: getAdminSection(hash) }
  if (hash === '#/produtores') return { page: 'producers' }
  if (hash === '#contato' || hash === '#/contato') return { page: 'contact' }
  if (hash === '#/calendario') return { page: 'calendar' }
  if (hash === '#/calculadora' || hash === '#calculadora') return { page: 'calculator' }

  const producerRoute = /^#\/produtor\/([^/?#]+)\/?$/.exec(hash)
  if (producerRoute) {
    try {
      return { page: 'producer', producerSlug: decodeURIComponent(producerRoute[1]) }
    } catch {
      return { page: 'producers' }
    }
  }

  const eventRoute = /^#\/evento\/([^/?#]+)$/.exec(hash)
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
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute)
  const accessIssue = useSyncExternalStore(subscribeAuthState, getAdminAccessIssue)
  const protectedPage = route.page === 'admin' || route.page === 'account'
  const showAccessNotice = Boolean(accessIssue) && (protectedPage || route.page === 'login')
  useAdminSessionMonitor(protectedPage && !accessIssue)

  useEffect(() => {
    const syncRoute = () => setRoute(getCurrentRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    if (route.page === 'home' && window.location.hash === '#sobre') {
      document.getElementById('sobre')?.scrollIntoView()
      return
    }

    window.scrollTo(0, 0)
  }, [route])

  useEffect(() => {
    document.title = `${showAccessNotice ? 'Acesso administrativo indisponível' : pageTitles[route.page]} | Brotando Feiras`
  }, [route.page, showAccessNotice])

  if (showAccessNotice && accessIssue) return <AdminDisabledPage reason={accessIssue} onReturnToLogin={() => {
    window.location.hash = '#/admin/login'
    setRoute({ page: 'login' })
    dismissAdminAccessIssue()
  }} />

  if (route.page === 'login') {
    return <LoginPage onLoginSuccess={() => { window.location.hash = '#/admin' }} />
  }

  if (route.page === 'admin') {
    return <AdminArea activeSection={route.section} />
  }

  if (route.page === 'forgot-password') return <PasswordRecoveryPage key="request" mode="request" />
  if (route.page === 'reset-password') return <PasswordRecoveryPage key={route.token} mode="reset" token={route.token} />

  if (route.page === 'account') return <AccountPage returnTarget={route.returnTarget} />
  if (route.page === 'calculator') return <PricingCalculatorPage />
  if (route.page === 'producers') return <ProducersPage />
  if (route.page === 'producer') return <ProducerProfilePage producerSlug={route.producerSlug} />

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
