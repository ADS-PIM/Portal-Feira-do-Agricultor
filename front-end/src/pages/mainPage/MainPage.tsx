import Header from '../../components/Header/Header';
import MainBanner from '../../components/MainBanner/MainBanner';
import EventPainel from '../../components/Event/EventPainel';
import PricingCalculatorPromo from '../../components/CalculatorPromo/PricingCalculatorPromo';
import ContactSection from '../../components/ContactSection/ContactSection';
import Footer from '../../components/Footer/Footer';
import { producers } from '../producersPage/producersData';
import './MainPage.css';

// Choose once per page load, keeping the selection stable during navigation.
const producerHighlights = (() => {
    const shuffled = [...producers];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled.slice(0, 3);
})();

const MainPage = () => {
    return (
        <>
            <Header/>
            <MainBanner/>
            <main className="main-page-sections">
                <EventPainel />
                <section className="home-producers-section" aria-labelledby="home-producers-title">
                    <div className="home-producers-header">
                        <p className="home-producers-kicker">NOSSAS RAÍZES</p>
                        <h2 id="home-producers-title">Nossos Produtores</h2>
                        <p>
                            Conheça as famílias que dedicam seu tempo e cuidado à terra, trazendo sabor e frescor para a feira.
                        </p>
                    </div>

                    <div className="home-producers-grid">
                        {producerHighlights.map((producer) => (
                            <article key={producer.slug} className="home-producer-card">
                                <div className="home-producer-visual">
                                    {producer.image && (
                                        <img
                                            className="home-producer-photo"
                                            src={producer.image}
                                            alt={producer.name}
                                            style={{ objectPosition: producer.imagePosition }}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    )}
                                    <span>{producer.category}</span>
                                </div>
                                <div className="home-producer-card-body">
                                    <h3><a href="/produtores">{producer.name}</a></h3>
                                    <p>{producer.description}</p>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="home-producers-actions">
                        <a href="/produtores" className="event-agenda-calendar-button home-producers-cta">Conhecer os Produtores</a>
                    </div>
                </section>
                <PricingCalculatorPromo />
                <ContactSection />
            </main>
            <Footer />
        </>
    )
}

export default MainPage
