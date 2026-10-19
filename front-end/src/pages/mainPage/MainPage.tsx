import { useEffect, useState } from 'react';
import Header from '../../components/Header/Header';
import MainBanner from '../../components/MainBanner/MainBanner';
import AboutSection from '../../components/AboutSection/AboutSection';
import EventPainel from '../../components/Event/EventPainel';
import PricingCalculatorPromo from '../../components/CalculatorPromo/PricingCalculatorPromo';
import NearestEventPainel from '../../components/Event/NearestEventPainel';
import ContactSection from '../../components/ContactSection/ContactSection';
import Footer from '../../components/Footer/Footer';
import { getNearestEvent, type NearestEvent } from '../../services/eventService';
import { getUserFacingError } from '../../services/errors';
import './MainPage.css';

const producerHighlights = [
    {
        name: 'Seu Zé do Córrego',
        title: 'Hortaliças e Folhagens',
        description: 'Planta de maneira limpa há mais de 25 anos no Córrego de Areia, trazendo as alfaces mais crocantes.',
    },
    {
        name: 'Dona Maria de Fátima',
        title: 'Frutas e Doces Caseiros',
        description: 'Especialista em cultivo de bananas, mamão e produtos do melhor sabor da região.',
    },
    {
        name: 'Francisco da Barra',
        title: 'Tubérculos e Raízes',
        description: 'Do distrito da Barra, cultiva macaxeiras e mandioca com capricho e tradição familiar.',
    },
];

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
                {loading && <p role="status">Carregando próximo evento...</p>}
                {error && <p className="main-page-error" role="alert">Erro ao carregar o próximo evento: {error}</p>}
                {!loading && !error && <NearestEventPainel event={nearestEvent}/>}
                <EventPainel />
                <section className="home-producers-section" aria-labelledby="home-producers-title">
                    <div className="home-producers-header">
                        <p className="home-producers-kicker">NOSSAS RAÍZES</p>
                        <h2 id="home-producers-title">Gente que faz brotar com carinho</h2>
                        <p>
                            Conheça as famílias que dedicam seu tempo e cuidado à terra, trazendo sabor e frescor para a feira.
                        </p>
                    </div>

                    <div className="home-producers-grid">
                        {producerHighlights.map((producer) => (
                            <article key={producer.name} className="home-producer-card">
                                <div className="home-producer-visual" aria-hidden="true">
                                    <span>{producer.title}</span>
                                </div>
                                <div className="home-producer-card-body">
                                    <h3>{producer.name}</h3>
                                    <p>{producer.description}</p>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="home-producers-actions">
                        <a href="#/produtores" className="home-producers-cta">Conhecer Todos os Produtores</a>
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