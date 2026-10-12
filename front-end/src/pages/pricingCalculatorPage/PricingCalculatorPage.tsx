import { useRef, useState } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import { calculateMarkup, parsePricingNumber, type MarkupInput } from '../../utils/pricingCalculator'
import './PricingCalculatorPage.css'

type Field = keyof MarkupInput
type FormValues = Record<Field, string>

const initialValues: FormValues = { cost: '', expenses: '0', taxes: '0', profit: '0' }
const exampleValues: FormValues = { cost: '30,00', expenses: '10', taxes: '5', profit: '30' }
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const fields: { name: Field; label: string; unit: string; hint: string; placeholder: string }[] = [
  { name: 'cost', label: 'Custo por unidade', unit: 'R$', placeholder: 'Ex.: 30,00', hint: 'Quanto custa produzir uma unidade? Inclua insumos, embalagem e mão de obra.' },
  { name: 'expenses', label: 'Despesas', unit: '%', placeholder: 'Ex.: 10', hint: 'Parcela do preço destinada a despesas como aluguel, energia e transporte.' },
  { name: 'taxes', label: 'Taxas e impostos', unit: '%', placeholder: 'Ex.: 5', hint: 'Percentual para impostos, taxas de cartão e comissões de venda.' },
  { name: 'profit', label: 'Lucro desejado', unit: '%', placeholder: 'Ex.: 30', hint: 'Percentual do preço de venda que você deseja ter como lucro.' },
]

export default function PricingCalculatorPage() {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const costInput = useRef<HTMLInputElement>(null)
  const numbers = {
    cost: parsePricingNumber(values.cost),
    expenses: parsePricingNumber(values.expenses),
    taxes: parsePricingNumber(values.taxes),
    profit: parsePricingNumber(values.profit),
  }
  const errors = Object.fromEntries(fields.map(({ name }) => {
    const value = numbers[name]
    let error = ''
    if (value === null) error = values[name].trim() ? 'Use um número positivo, com vírgula ou ponto para os decimais, sem separador de milhar.' : 'Preencha este campo.'
    else if (name === 'cost' && value <= 0) error = 'Informe um custo maior que zero.'
    else if (name !== 'cost' && value >= 100) error = 'Informe um percentual menor que 100%.'
    return [name, error]
  })) as Record<Field, string>

  const { cost, expenses, taxes, profit } = numbers
  const totalPercentage = expenses !== null && taxes !== null && profit !== null ? expenses + taxes + profit : null
  const invalidTotal = totalPercentage !== null && totalPercentage >= 100
  const result = cost !== null && expenses !== null && taxes !== null && profit !== null
    ? calculateMarkup({ cost, expenses, taxes, profit })
    : null
  const breakdown = result ? [
    { label: 'Custo do produto', amount: result.cost, className: 'cost', share: 100 - result.totalPercentage },
    { label: 'Despesas', amount: result.expensesAmount, className: 'expenses', share: expenses! },
    { label: 'Taxas e impostos', amount: result.taxesAmount, className: 'taxes', share: taxes! },
    { label: 'Lucro desejado', amount: result.profitAmount, className: 'profit', share: profit! },
  ] : []

  function reset() {
    setValues(initialValues)
    setTouched({})
    costInput.current?.focus()
  }

  return (
    <>
      <Header initialActiveLink="#/calculadora" />
      <main className="markup-page">
        <div className="markup-shell">
          <a className="markup-back" href="#inicio"><Icon name="arrowLeft" /> Voltar ao início</a>
          <header className="markup-heading">
            <h1>Calculadora de precificação</h1>
            <p>Encontre um preço que cubra seus custos e inclua o lucro desejado. Preencha os valores e acompanhe o cálculo por Markup.</p>
          </header>

          <div className="markup-layout">
            <section className="markup-form-panel" aria-labelledby="markup-form-title">
              <div className="markup-panel-heading">
                <div><h2 id="markup-form-title">Vamos calcular?</h2></div>
                <button className="markup-example" type="button" onClick={() => { setValues(exampleValues); setTouched({}) }}>Usar exemplo</button>
              </div>
              <p className="markup-intro">Informe o custo em reais e os demais valores em porcentagem. Use 0 quando não houver uma despesa, taxa ou lucro.</p>

              <form className="markup-form" onSubmit={(event) => event.preventDefault()} autoComplete="off">
                {fields.map(({ name, label, unit, hint, placeholder }) => {
                  const error = (touched[name] || values[name] !== '') ? errors[name] : ''
                  return (
                    <div className="markup-field" key={name}>
                      <label htmlFor={`markup-${name}`}>{label} <span>({unit})</span></label>
                      <div className={`markup-input-wrap${error ? ' has-error' : ''}`}>
                        <span aria-hidden="true">{unit}</span>
                        <input
                          ref={name === 'cost' ? costInput : undefined}
                          id={`markup-${name}`}
                          name={name}
                          type="text"
                          inputMode="decimal"
                          maxLength={16}
                          value={values[name]}
                          placeholder={placeholder}
                          required
                          aria-invalid={Boolean(error)}
                          aria-describedby={`markup-${name}-hint${error ? ` markup-${name}-error` : ''}${name !== 'cost' && invalidTotal ? ' markup-total-error' : ''}`}
                          onChange={(event) => setValues((previous) => ({ ...previous, [name]: event.target.value }))}
                          onBlur={() => setTouched((previous) => ({ ...previous, [name]: true }))}
                        />
                      </div>
                      <p id={`markup-${name}-hint`} className="markup-hint">{hint}</p>
                      {error && <p id={`markup-${name}-error`} className="markup-error">{error}</p>}
                    </div>
                  )
                })}
                <div className={`markup-total${invalidTotal ? ' has-error' : ''}`}>
                  <span>Despesas + taxas + lucro</span>
                  <strong>{totalPercentage !== null ? `${decimal.format(totalPercentage)}%` : '—'}</strong>
                </div>
                {invalidTotal ? (
                  <p id="markup-total-error" className="markup-error" role="alert">A soma deve ser menor que 100%. Reduza os percentuais para deixar uma parte do preço destinada ao custo do produto.</p>
                ) : <p className="markup-hint">A soma precisa ficar abaixo de 100% para calcular o preço.</p>}
                <button className="markup-reset" type="button" onClick={reset}>Limpar valores</button>
              </form>
            </section>

            <aside className="markup-result-panel" aria-labelledby="markup-result-title">
              <div className="markup-result-card">
                <span className="markup-step">02 · SEU RESULTADO</span>
                <h2 id="markup-result-title"><Icon name="calculator" /> Preço de venda por unidade</h2>
                <div className="markup-price-area" role="status" aria-live="polite" aria-atomic="true">
                  <strong className="markup-price">{result ? currency.format(result.price) : 'R$ —'}</strong>
                  <p>{result ? 'Preço sugerido com os percentuais informados.' : invalidTotal ? 'Ajuste os percentuais para ver o resultado.' : 'Preencha os valores válidos ao lado para ver seu preço.'}</p>
                </div>
                <div className="markup-multiplier"><span>Multiplicador Markup</span><strong>{result ? `${decimal.format(result.multiplier)}×` : '—'}</strong></div>
                <p className="markup-result-note">O resultado é atualizado automaticamente.</p>
              </div>

              <section className="markup-breakdown" aria-labelledby="markup-breakdown-title">
                <h3 id="markup-breakdown-title">Para onde vai cada parte do preço?</h3>
                {result ? (
                  <>
                    <div className="markup-bar" aria-hidden="true">{breakdown.map((item) => <span key={item.className} className={item.className} style={{ width: `${item.share}%` }} />)}</div>
                    <dl>{breakdown.map((item) => <div key={item.className}><dt><span className={`markup-dot ${item.className}`} />{item.label}</dt><dd>{currency.format(item.amount)}</dd></div>)}</dl>
                    <p className="markup-hint">Valores por unidade. O arredondamento para centavos pode gerar pequenas diferenças na soma.</p>
                  </>
                ) : <p className="markup-hint">Aqui você verá quanto do preço cobre o custo, as despesas, as taxas e o lucro.</p>}
              </section>
              <p className="markup-local-note"><Icon name="information" /> Seus valores não são salvos. Ao sair ou recarregar a página, a simulação será apagada.</p>
            </aside>
          </div>

          <section className="markup-guide" aria-labelledby="markup-guide-title">
            <div>
              <span className="markup-step">ENTENDA O CÁLCULO</span>
              <h2 id="markup-guide-title">Como funciona o Markup?</h2>
              <p>O Markup é um multiplicador aplicado ao custo do produto. Despesas, taxas e lucro são parcelas do <strong>preço de venda</strong>.</p>
              <p className="markup-formula">Markup = 1 ÷ [1 − (despesas + taxas + lucro) ÷ 100]<br />Preço de venda = custo por unidade × Markup</p>
            </div>
            <div className="markup-guide-tips">
              <h3>Ainda não sabe o custo por unidade?</h3>
              <p>Some os custos de produção de um lote e divida pela quantidade produzida. Por exemplo: R$ 100,00 para produzir 50 unidades = R$ 2,00 por unidade.</p>
              <p>Inclua cada gasto uma única vez: se ele já faz parte do custo por unidade, não o repita no percentual de despesas.</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
