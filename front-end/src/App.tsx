import './App.css'
import { useEffect, useState } from 'react'
import MainPage from './pages/mainPage/MainPage'
import LoginPage from './pages/loginPage/LoginPage'
import ContactUsPage from './pages/contactUs/ContactUs'
import CalendarPage from './pages/calendarPage/CalendarPage'
import AdminArea from './pages/adminArea/AdminArea'
import EventPage from './pages/eventPage/EventPage'
import AccountPage from './pages/accountPage/AccountPage'

type AppRoute =
  | { page: 'home' | 'login' | 'admin' | 'contact' | 'calendar' | 'account' }
  | { page: 'event'; eventId: string }

function getCurrentRoute(): AppRoute {
  const hash = window.location.hash || '#inicio'

  if (hash === '#/admin/login') return { page: 'login' }
  if (hash === '#/minha-conta') return { page: 'account' }
  if (hash === '#/admin') return { page: 'admin' }
  if (hash === '#contato' || hash === '#/contato') return { page: 'contact' }
  if (hash === '#/calendario') return { page: 'calendar' }

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
    window.scrollTo(0, 0)
  }, [route])

  if (route.page === 'login') {
    return <LoginPage onLoginSuccess={() => { window.location.hash = '#/admin' }} />
  }

  if (route.page === 'admin') {
    return <AdminArea />
  }

  if (route.page === 'account') return <AccountPage />

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
