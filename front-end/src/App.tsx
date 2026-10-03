import './App.css'
import { useEffect, useState } from 'react'
import MainPage from './pages/mainPage/MainPage'
import LoginPage from './pages/loginPage/LoginPage'

function App() {
  const [isLoginPage, setIsLoginPage] = useState(() => window.location.hash === '#/admin/login')

  useEffect(() => {
    const syncRoute = () => setIsLoginPage(window.location.hash === '#/admin/login')
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  if (isLoginPage) {
    return <LoginPage onLoginSuccess={() => { window.location.hash = '#inicio' }} />
  }

  return <MainPage />
}

export default App
