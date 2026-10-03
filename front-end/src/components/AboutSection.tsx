import './AboutSection.css';

const AboutSection = () => {
    return (
        <section id="sobre" className="about-section" aria-labelledby="about-section-title">
            <p className="about-section-eyebrow">O QUE É?</p>
            <h2 id="about-section-title">Cultivando conexões e fortalecendo o campo</h2>
            <p className="about-section-description">
                O Brotando Feiras nasceu para aproximar os consumidores urbanos de Tabuleiro do Norte
                da riqueza gerada por nossas famílias agricultoras, facilitando o acesso a alimentos
                livres de agrotóxicos.
            </p>
        </section>
    );
};

export default AboutSection;
