import './App.css'
import { useEffect, useState } from 'react'
import MainPage from './pages/mainPage/MainPage'
import LoginPage from './pages/loginPage/LoginPage'
import ContactUsPage from './pages/contactUs/ContactUs'
import CalendarPage from './pages/calendarPage/CalendarPage'
import AdminArea from './pages/adminArea/AdminArea'
import EventPage from './pages/eventPage/EventPage'
import AccountPage from './pages/accountPage/AccountPage'
import PricingCalculatorPage from './pages/pricingCalculatorPage/PricingCalculatorPage'
import ProducersPage from './pages/producersPage/ProducersPage'
import ProducerProfilePage from './pages/producersPage/ProducerProfilePage'

type AppRoute =
  | { page: 'home' | 'login' | 'admin' | 'contact' | 'calendar' | 'account' | 'calculator' | 'producers' }
  | { page: 'producer'; producerSlug: string }
  | { page: 'event'; eventId: string }

const pageTitles: Record<AppRoute['page'], string> = {
  home: 'Início',
  login: 'Entrar na área administrativa',
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
  if (hash === '#/minha-conta') return { page: 'account' }
  if (hash === '#/admin') return { page: 'admin' }
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
    document.title = `${pageTitles[route.page]} | Brotando Feiras`
  }, [route.page])

  if (route.page === 'login') {
    return <LoginPage onLoginSuccess={() => { window.location.hash = '#/admin' }} />
  }

  if (route.page === 'admin') {
    return <AdminArea />
  }

  if (route.page === 'account') return <AccountPage />
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
