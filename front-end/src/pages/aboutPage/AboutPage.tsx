import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import AboutPhotoFrame from './AboutPhotoFrame'
import { aboutJourney, aboutPhotos, aboutValues } from './aboutContent'
import './AboutPage.css'

const AboutPage = () => (
    <>
        <Header initialActiveLink="/sobre" />
        <main className="about-page" aria-labelledby="about-page-title">
            <header className="about-page-header about-shell">
                <h1 id="about-page-title">Sobre nós</h1>
                <p>Conheça a história da nossa feira e das pessoas que fazem parte dela.</p>
            </header>

            <section className="about-intro about-shell" aria-labelledby="about-intro-title">
                <div className="about-intro-copy">
                    <p className="about-eyebrow">BROTANDO FEIRAS</p>
                    <h2 id="about-intro-title">Do campo à praça, a gente cresce junto.</h2>
                    <p>Somos famílias agricultoras, artesãs e artesãos de Tabuleiro do Norte. Com o apoio do Instituto Brotar, a feira aproxima quem produz de quem compra e valoriza o trabalho da nossa terra.</p>
                    <p className="about-location"><Icon name="location" /> Tabuleiro do Norte, Ceará</p>
                </div>
                <AboutPhotoFrame photo={aboutPhotos.community} caption="Gente, encontros e o que vem da nossa terra." />
            </section>

            <section id="nossa-caminhada" className="about-section about-history about-shell" aria-labelledby="about-history-title">
                <header className="about-section-heading">
                    <p className="about-eyebrow">NOSSAS RAÍZES</p>
                    <h2 id="about-history-title">Nossa caminhada</h2>
                </header>
                <div className="about-section-grid">
                    <AboutPhotoFrame photo={aboutPhotos.history} caption="Cada encontro faz parte da nossa caminhada." />
                    <ol className="about-journey">
                        {aboutJourney.map((step, index) => (
                            <li key={step.title}>
                                <span className="about-step" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                                <div><h3>{step.title}</h3><p>{step.text}</p></div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="about-values-band" aria-labelledby="about-values-title">
                <div className="about-shell">
                    <header className="about-section-heading">
                        <p className="about-eyebrow">O QUE NOS MOVE</p>
                        <h2 id="about-values-title">A gente cultiva mais do que alimentos.</h2>
                    </header>
                    <div className="about-values">
                        {aboutValues.map(value => (
                            <article key={value.title} className={`about-value about-value--${value.color}`}>
                                <span className="about-value-icon"><Icon name={value.icon} /></span>
                                <div><h3>{value.title}</h3><p>{value.text}</p></div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="about-section about-women about-shell" aria-labelledby="about-women-title">
                <header className="about-section-heading">
                    <p className="about-eyebrow">QUEM FAZ ACONTECER</p>
                    <h2 id="about-women-title">O trabalho das mulheres faz a feira florescer.</h2>
                </header>
                <div className="about-section-grid">
                    <div className="about-women-copy">
                        <p>São mãos que plantam, preparam, criam e acolhem. Na feira, as mulheres encontram espaço para vender, trocar experiências e fortalecer sua autonomia.</p>
                        <p>Quando esse trabalho é valorizado, toda a comunidade cresce junto.</p>
                        <a className="about-button event-agenda-calendar-button" href="/produtores">Conheça essas histórias <Icon name="arrowRight" /></a>
                    </div>
                    <AboutPhotoFrame photo={aboutPhotos.women} caption="Mulheres que cuidam, produzem e transformam." />
                </div>
            </section>

            <section className="about-visit about-shell" aria-labelledby="about-visit-title">
                <div>
                    <p className="about-eyebrow">A GENTE SE ENCONTRA NA FEIRA</p>
                    <h2 id="about-visit-title">Venha conhecer de perto.</h2>
                    <p>Confira as próximas datas e venha conversar com quem produz.</p>
                </div>
                <a className="about-calendar-button pricing-calculator-button" href="/calendario">Ver calendário de eventos <Icon name="arrowRight" /></a>
            </section>

            <section className="about-portal about-shell" aria-labelledby="about-portal-title">
                <div>
                    <p className="about-eyebrow">POR TRÁS DO PORTAL</p>
                    <h2 id="about-portal-title">Essa história também chegou às portas do IFCE</h2>
                    <p>Conheça a equipe e a caminhada de criação deste portal.</p>
                </div>
                <a className="about-portal-link event-agenda-calendar-button" href="/sobre/equipe">Quem fez o portal <Icon name="arrowRight" /></a>
            </section>
        </main>
        <Footer />
    </>
)

export default AboutPage
