import './App.css'
import { useEffect, useState } from 'react'
import MainPage from './pages/mainPage/MainPage'
import LoginPage from './pages/loginPage/LoginPage'
import ContactUsPage from './pages/contactUs/ContactUs'
import CalendarPage from './pages/calendarPage/CalendarPage'

function getCurrentRoute() {
  const hash = window.location.hash || '#inicio'

  if (hash === '#/admin/login') return 'login'
  if (hash === '#contato' || hash === '#/contato') return 'contact'
  if (hash === '#/calendario') return 'calendar'

  return 'home'
}

function App() {
  const [route, setRoute] = useState<'home' | 'login' | 'contact' | 'calendar'>(getCurrentRoute)

  useEffect(() => {
    const syncRoute = () => setRoute(getCurrentRoute())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [route])

  if (route === 'login') {
    return <LoginPage onLoginSuccess={() => { window.location.hash = '#inicio' }} />
  }

  if (route === 'contact') {
    return <ContactUsPage />
  }

  if (route === 'calendar') {
    return <CalendarPage />
  }

  return <MainPage />
}

export default App
