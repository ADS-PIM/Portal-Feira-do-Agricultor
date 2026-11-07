import { useEffect, useState } from 'react';
import Header from '../../components/Header/Header';
import MainBanner from '../../components/MainBanner/MainBanner';
import AboutSection from '../../components/AboutSection/AboutSection';
import EventPainel from '../../components/Event/EventPainel';
import EventLoading from '../../components/Event/EventLoading';
import PricingCalculatorPromo from '../../components/CalculatorPromo/PricingCalculatorPromo';
import NearestEventPainel from '../../components/Event/NearestEventPainel';
import ContactSection from '../../components/ContactSection/ContactSection';
import Footer from '../../components/Footer/Footer';
import { getNearestEvent, type NearestEvent } from '../../services/eventService';
import { getUserFacingError } from '../../services/errors';
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
    const [nearestEvent, setNearestEvent] = useState<NearestEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const now = new Date();
        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('-');

        const loadNearestEvent = async () => {
            try {
                setNearestEvent(await getNearestEvent(today, controller.signal));
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setError(getUserFacingError(requestError, 'Não foi possível carregar o próximo evento. Tente novamente mais tarde.'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadNearestEvent();
        return () => controller.abort();
    }, []);

    return (
        <>
            <Header/>
            <MainBanner/>
            <AboutSection />
            <div className={`main-page-sections${error ? ' has-event-error' : ''}`}>
                {loading && <EventLoading message="Carregando próximo evento..." />}
                {error && <p className="main-page-error" role="alert">Erro ao carregar o próximo evento: {error}</p>}
                {!loading && !error && <NearestEventPainel event={nearestEvent}/>}
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
                                    <h3><a href={`/produtor/${encodeURIComponent(producer.slug)}`}>{producer.name}</a></h3>
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
            </div>
            <Footer />
        </>
    )
}

export default MainPage
