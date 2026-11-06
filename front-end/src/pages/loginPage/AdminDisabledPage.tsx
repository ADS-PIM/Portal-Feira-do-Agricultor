import { useEffect, useRef } from 'react'
import Header from '../../components/Header/Header'
import Icon from '../../components/Icon'
import logo from '../../assets/instituto_brotar_logo_preto.png'
import './LoginPage.css'
import '../../components/Login/LoginPainel.css'
import './AdminDisabledPage.css'
import type { AdminAccessIssue } from '../../services/authToken'

export default function AdminDisabledPage({ onReturnToLogin, reason = 'disabled' }: { onReturnToLogin?: () => void; reason?: AdminAccessIssue }) {
    const heading = useRef<HTMLHeadingElement>(null)
    useEffect(() => { heading.current?.focus() }, [])
    const revoked = reason === 'revoked'
    const titleId = revoked ? 'admin-revoked-title' : 'admin-disabled-title'

    return (
        <div className="login-page admin-disabled-page">
            <Header initialActiveLink="#/admin" />
            <main className="login-page-content">
                <section className="login-painel admin-disabled-panel" aria-labelledby={titleId}>
                    <img className="login-painel-logo" src={logo} alt="Instituto Brotar" />
                    <div className="admin-disabled-message" role="alert">
                        <span className="admin-disabled-icon" aria-hidden="true"><Icon name="userShield" /></span>
                        <h1 id={titleId} ref={heading} tabIndex={-1}>{revoked ? 'Você não tem mais permissões administrativas' : 'Administrador desativado'}</h1>
                        <p>{revoked ? 'Seu acesso à área administrativa foi removido. Sua sessão foi encerrada.' : 'O acesso desta conta administrativa foi desativado.'}</p>
                        <p>{revoked ? 'Se precisar de acesso novamente, entre em contato com o administrador principal.' : 'Para solicitar a reativação, entre em contato com o administrador principal.'}</p>
                    </div>
                    <a className="login-painel-submit admin-disabled-back" href="#/admin/login" onClick={onReturnToLogin}>
                        <Icon name="arrowLeft" /> Voltar para o login
                    </a>
                </section>
            </main>
        </div>
    )
}
