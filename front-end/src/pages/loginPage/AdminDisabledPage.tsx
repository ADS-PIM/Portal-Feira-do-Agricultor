import { useEffect, useRef } from 'react'
import Header from '../../components/Header/Header'
import Icon from '../../components/Icon'
import logo from '../../assets/instituto_brotar_logo_preto.png'
import './LoginPage.css'
import '../../components/Login/LoginPainel.css'
import './AdminDisabledPage.css'

export default function AdminDisabledPage({ onReturnToLogin }: { onReturnToLogin?: () => void }) {
    const heading = useRef<HTMLHeadingElement>(null)
    useEffect(() => { heading.current?.focus() }, [])

    return (
        <div className="login-page admin-disabled-page">
            <Header initialActiveLink="#/admin" />
            <main className="login-page-content">
                <section className="login-painel admin-disabled-panel" aria-labelledby="admin-disabled-title">
                    <img className="login-painel-logo" src={logo} alt="Instituto Brotar" />
                    <div className="admin-disabled-message" role="alert">
                        <span className="admin-disabled-icon" aria-hidden="true"><Icon name="userShield" /></span>
                        <h1 id="admin-disabled-title" ref={heading} tabIndex={-1}>Administrador desativado</h1>
                        <p>O acesso desta conta administrativa foi desativado.</p>
                        <p>Para solicitar a reativação, entre em contato com o administrador principal.</p>
                    </div>
                    <a className="login-painel-submit admin-disabled-back" href="#/admin/login" onClick={onReturnToLogin}>
                        <Icon name="arrowLeft" /> Voltar para o login
                    </a>
                </section>
            </main>
        </div>
    )
}
