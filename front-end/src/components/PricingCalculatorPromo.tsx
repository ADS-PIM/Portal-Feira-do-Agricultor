import './PricingCalculatorPromo.css';

const PricingCalculatorPromo = () => {
    return (
        <section id="calculadora" className="pricing-calculator-promo" aria-labelledby="pricing-calculator-title">
            <div className="pricing-calculator-card">
                <div className="pricing-calculator-content">
                    <h2 id="pricing-calculator-title">Calculadora de Precificação</h2>
                    <p>
                        Calcule o preço justo do seu produto considerando sementes, água, transporte e horas
                        trabalhadas. Uma ferramenta simples para decisões mais seguras e sustentáveis.
                    </p>
                    <button className="pricing-calculator-button" type="button">
                        Acessar Calculadora
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </button>
                </div>

                <aside className="pricing-calculator-preview" aria-label="Resumo do cálculo de preço">
                    <div className="pricing-calculator-preview-heading">
                        <span className="pricing-calculator-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                                <rect x="4" y="3" width="16" height="18" rx="2" />
                                <path d="M7.5 7.5h9M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
                            </svg>
                        </span>
                        <div>
                            <p className="pricing-calculator-kicker">RESULTADO RÁPIDO</p>
                            <h3>Preço justo</h3>
                        </div>
                    </div>
                    <ul>
                        <li>Insumos</li>
                        <li>Operação</li>
                        <li>Transporte e labor</li>
                    </ul>
                </aside>
            </div>
        </section>
    );
};

export default PricingCalculatorPromo;
