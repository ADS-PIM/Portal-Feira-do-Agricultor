import { useEffect, useState } from 'react';
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService';
import { defaultBusinessDescription } from '../../utils/businessDescription';
import './AboutSection.css';

const AboutSection = () => {
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadBusinessInfo = async () => {
            try {
                setBusinessInfo(await getBusinessInfo(controller.signal));
            } catch {
                if (!controller.signal.aborted) {
                    setBusinessInfo(null);
                }
            }
        };

        void loadBusinessInfo();
        return () => controller.abort();
    }, []);

    const description = businessInfo?.description?.trim() || defaultBusinessDescription;

    return (
        <section id="sobre" className="about-section" aria-labelledby="about-section-title">
            <p className="about-section-eyebrow">O QUE É?</p>
            <h2 id="about-section-title">Cultivando conexões e fortalecendo o campo</h2>
            <p className="about-section-description">{description}</p>
        </section>
    );
};

export default AboutSection;
