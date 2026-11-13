import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import './AboutPage.css'

const PortalTeamPage = () => (
    <>
        <Header initialActiveLink="/sobre" />
        <main className="about-page about-team-page" aria-labelledby="portal-team-title">
            <div className="about-shell">
                <a href="/sobre" className="about-text-link"><Icon name="arrowLeft" /> Voltar para Sobre nós</a>
                <header className="about-team-intro">
                    <p className="about-eyebrow">POR TRÁS DO PORTAL</p>
                    <h1 id="portal-team-title">Quem fez o portal</h1>
                    <p>A feira tem muitas histórias. A criação deste portal também.</p>
                </header>
                <section className="about-team-coming" aria-labelledby="portal-team-coming-title">
                    <span className="about-value-icon"><Icon name="users" /></span>
                    <h2 id="portal-team-coming-title">Estamos preparando esse encontro.</h2>
                    <p>Em breve, você vai conhecer a equipe de desenvolvimento e os passos dessa construção.</p>
                    {/* Add the team's names, photos and development story when supplied. */}
                </section>
            </div>
        </main>
        <Footer />
    </>
)

export default PortalTeamPage
