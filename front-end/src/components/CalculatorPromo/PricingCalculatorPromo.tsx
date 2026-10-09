import Icon from '../Icon'
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
                        <Icon name="arrowRight" />
                    </button>
                </div>

                <aside className="pricing-calculator-preview" aria-label="Resumo do cálculo de preço">
                    <div className="pricing-calculator-preview-heading">
                        <span className="pricing-calculator-icon" aria-hidden="true">
                            <Icon name="calculator" />
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
