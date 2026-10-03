import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import MainBanner from '../../components/MainBanner';
import AboutSection from '../../components/AboutSection';
import EventPainel from '../../components/EventPainel';
import PricingCalculatorPromo from '../../components/PricingCalculatorPromo';
import NearestEventPainel from '../../components/NearestEventPainel';
import ContactSection from '../../components/ContactSection';
import Footer from '../../components/Footer';
import { getNearestEvent, type NearestEvent } from '../../services/eventService';
import './MainPage.css';

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
                    setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar o próximo evento.');
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
            <div className="main-page-sections">
                {loading && <p role="status">Carregando próximo evento...</p>}
                {error && <p role="alert">Erro ao carregar o próximo evento: {error}</p>}
                {!loading && !error && <NearestEventPainel event={nearestEvent}/>}
                <EventPainel />
                <PricingCalculatorPromo />
                <ContactSection />
            </div>
            <Footer />
        </>
    )
}

export default MainPage