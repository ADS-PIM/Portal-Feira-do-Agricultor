import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import AboutPhotoFrame from './AboutPhotoFrame'
import { revealOnScroll } from '../../utils/revealOnScroll'
import { aboutJourney, aboutPhotos, aboutValues } from './aboutContent'
import './AboutPage.css'

const AboutPage = () => (
    <>
        <Header initialActiveLink="/sobre" />
        <main className="about-page scroll-reveal-page" aria-labelledby="about-page-title">
            <div className="about-intro about-shell">
                <div className="about-intro-copy">
                    <header className="about-page-header">
                        <h1 id="about-page-title">Sobre nós</h1>
                        <p>Conheça a história da nossa feira e das pessoas que fazem parte dela.</p>
                    </header>
                    <h2 id="about-intro-title">Do campo à praça, a gente cresce junto.</h2>
                    <p>Somos famílias agricultoras, artesãs e artesãos de Tabuleiro do Norte. Com o apoio do Instituto Brotar, a feira aproxima quem produz de quem compra e valoriza o trabalho da nossa terra.</p>
                    <p className="about-location"><Icon name="location" /> Tabuleiro do Norte, Ceará</p>
                </div>
                <AboutPhotoFrame photo={aboutPhotos.community} caption="Gente, encontros e o que vem da nossa terra." />
            </div>

            <section id="nossa-caminhada" className="about-section about-history about-shell" aria-labelledby="about-history-title">
                <header className="about-section-heading">
                    <h2 id="about-history-title">Nossa caminhada</h2>
                </header>
                <ol className="about-journey">
                    {aboutJourney.map((step, index) => (
                        <li key={step.title} data-home-reveal-card>
                            <span className="about-step" aria-hidden="true" ref={revealOnScroll}>{String(index + 1).padStart(2, '0')}</span>
                            <div><h3>{step.title}</h3><p>{step.text}</p></div>
                        </li>
                    ))}
                </ol>
                <AboutPhotoFrame photo={aboutPhotos.history} caption="Cada encontro faz parte da nossa caminhada." />
            </section>

            <section className="about-values-band" aria-labelledby="about-values-title">
                <div className="about-shell">
                    <header className="about-section-heading">
                        <h2 id="about-values-title">A gente cultiva mais do que alimentos.</h2>
                    </header>
                    <div className="about-values">
                        {aboutValues.map(value => (
                            <article key={value.title} className={`about-value about-value--${value.color}`} data-home-reveal-card>
                                <span className="about-value-icon" ref={revealOnScroll}><Icon name={value.icon} /></span>
                                <div><h3>{value.title}</h3><p>{value.text}</p></div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="about-section about-women about-shell" aria-labelledby="about-women-title">
                <div className="about-section-grid">
                    <div className="about-women-copy">
                        <h2 id="about-women-title">O trabalho das mulheres faz a feira florescer.</h2>
                        <p>São mãos que plantam, preparam, criam e acolhem. Na feira, as mulheres encontram espaço para vender, trocar experiências e fortalecer sua autonomia.</p>
                        <p>Quando esse trabalho é valorizado, toda a comunidade cresce junto.</p>
                        <a className="about-button event-agenda-calendar-button" href="/produtores">Conheça essas histórias <Icon name="arrowRight" /></a>
                    </div>
                    <AboutPhotoFrame photo={aboutPhotos.women} caption="Mulheres que cuidam, produzem e transformam." />
                </div>
            </section>

            <section className="about-visit about-shell" aria-labelledby="about-visit-title" data-home-reveal-card>
                <div>
                    <h2 id="about-visit-title" ref={revealOnScroll}>Venha conhecer de perto.</h2>
                    <p>Confira as próximas datas e venha conversar com quem produz.</p>
                </div>
                <a className="about-calendar-button pricing-calculator-button" href="/calendario">Ver calendário de eventos <Icon name="arrowRight" /></a>
            </section>

            <section className="about-portal about-shell" aria-labelledby="about-portal-title" data-home-reveal-card>
                <div>
                    <h2 id="about-portal-title" ref={revealOnScroll}>Essa história também chegou às portas do IFCE</h2>
                    <p>Conheça a equipe e a caminhada de criação deste portal.</p>
                </div>
                <a className="about-portal-link event-agenda-calendar-button" href="/sobre/equipe">Quem fez o portal <Icon name="arrowRight" /></a>
            </section>
        </main>
        <Footer />
    </>
)

export default AboutPage
