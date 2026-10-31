import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon, { type IconName } from '../../components/Icon'
import { calculateMarkup, parsePricingNumber, parseProductionHours, type MarkupInput, type ProductionTimeUnit } from '../../utils/pricingCalculator'
import AdvancedPricingCalculator from './AdvancedPricingCalculator'
import PercentageField from './PercentageField'
import CalculatorFieldHelp from './CalculatorFieldHelp'
import { CalculatorSteps, CalculatorStepActions } from './CalculatorSteps'
import ProductionTimeUnitField from './ProductionTimeUnitField'
import './PricingCalculatorPage.css'

type Field = keyof MarkupInput
type FormValues = Record<Field, string> & { timeUnit: ProductionTimeUnit }
type FieldDefinition = { name: Field; label: string; unit: string; hint: string; placeholder: string }

const calculatorMethods = [
  { id: 'main', label: 'Principal', icon: 'calculator' },
  { id: 'advanced', label: 'Avançada', icon: 'sliders' },
] as const
type CalculatorMethod = typeof calculatorMethods[number]['id']

const initialValues: FormValues = {
  materialCost: '', productionHours: '', hourlyRate: '', monthlyFixedExpenses: '0',
  monthlyRevenue: '', variableExpenses: '0', profit: '0', timeUnit: 'hour',
}
const exampleValues: FormValues = {
  materialCost: '30,00', productionHours: '2', hourlyRate: '20,00', monthlyFixedExpenses: '1.000,00',
  monthlyRevenue: '10.000,00', variableExpenses: '5', profit: '30', timeUnit: 'hour',
}
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const preciseDecimal = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 17 })
function formatPercentage(value: number) {
  // Keep a valid denominator from appearing as zero after display rounding.
  const rounded = Number(value.toFixed(4))
  if (value > 0 && rounded === 0) return preciseDecimal.format(Number(value.toPrecision(4)))
  return (value < 100 && rounded === 100 ? preciseDecimal : decimal).format(value)
}
const fieldGroups: { title: string; icon: IconName; fields: FieldDefinition[] }[] = [
  {
    title: 'Produção de uma unidade', icon: 'box', fields: [
      { name: 'materialCost', label: 'Custo de material por unidade', unit: 'R$', placeholder: 'Ex.: 30,00', hint: 'Somente materiais e embalagem. A mão de obra é calculada separadamente.' },
      { name: 'productionHours', label: 'Tempo de produção da unidade', unit: 'horas', placeholder: 'Ex.: 2', hint: 'Tempo gasto para produzir uma unidade.' },
      { name: 'hourlyRate', label: 'Valor da hora', unit: 'R$', placeholder: 'Ex.: 20,00', hint: 'Quanto vale uma hora do seu trabalho.' },
    ],
  },
  {
    title: 'Seu negócio por mês', icon: 'store', fields: [
      { name: 'monthlyFixedExpenses', label: 'Despesas fixas mensais', unit: 'R$', placeholder: 'Ex.: 1.000,00', hint: 'Ex.: aluguel, internet e contas fixas.' },
      { name: 'monthlyRevenue', label: 'Faturamento médio mensal', unit: 'R$', placeholder: 'Ex.: 10.000,00', hint: 'Média de vendas. Deve ser maior que zero.' },
    ],
  },
  {
    title: 'Despesas e lucro sobre a venda', icon: 'percent', fields: [
      { name: 'variableExpenses', label: 'Despesas variáveis', unit: '%', placeholder: 'Ex.: 5', hint: 'Ex.: taxas de venda e comissões.' },
      { name: 'profit', label: 'Lucro desejado', unit: '%', placeholder: 'Ex.: 30', hint: 'Parcela do preço que será seu lucro.' },
    ],
  },
]
const fields = fieldGroups.flatMap((group) => group.fields)
const percentageFields: Field[] = ['monthlyFixedExpenses', 'monthlyRevenue', 'variableExpenses', 'profit']

const fieldHelp: Record<Field, { explanation: string; example: string; effect: string }> = {
  materialCost: {
    explanation: 'Some o que você gasta com ingredientes, materiais e embalagem para preparar apenas uma unidade do produto. Não inclua seu tempo de trabalho aqui.',
    example: 'Se os ingredientes de um pote de doce custam R$ 4 e o pote custa R$ 1, preencha R$ 5.',
    effect: 'Quanto maior esse gasto, maior precisa ser o preço de venda para pagar os materiais e ainda cobrir as despesas e o lucro.',
  },
  productionHours: {
    explanation: 'Informe o tempo de trabalho necessário para fazer uma unidade e escolha horas ou minutos. Se você faz vários produtos juntos, divida o tempo total pela quantidade produzida.',
    example: 'Se você leva 2 horas para fazer 10 potes de doce, cada pote usa 0,2 hora ou 12 minutos. Meia hora pode ser informada como 0,5 hora ou 30 minutos.',
    effect: 'Os minutos são divididos por 60 antes de multiplicar pelo valor da sua hora. Com a hora a R$ 20, uma unidade que leva 30 minutos tem R$ 10 de mão de obra.',
  },
  hourlyRate: {
    explanation: 'Informe quanto você quer receber por uma hora do seu trabalho. Seu trabalho também tem um custo, mesmo quando é você quem produz.',
    example: 'Se sua hora vale R$ 20 e uma unidade leva meia hora para ficar pronta, o custo do trabalho dessa unidade é R$ 10.',
    effect: 'Quanto maior o valor da hora, maior o preço calculado. Esse pagamento pelo trabalho é separado do lucro do negócio.',
  },
  monthlyFixedExpenses: {
    explanation: 'Some as contas do negócio que você paga por mês, mesmo quando vende pouco, como aluguel e internet. Se uma conta também é da sua casa, inclua só a parte usada no negócio. Não repita os materiais nem o trabalho já informados.',
    example: 'Com R$ 1.000 de contas e R$ 10.000 de vendas no mês, a calculadora reserva 10% do preço de cada venda para essas contas.',
    effect: 'Mantendo as vendas mensais iguais, contas maiores aumentam a parte reservada para despesas e o preço calculado. Se não tiver essas despesas, informe 0.',
  },
  monthlyRevenue: {
    explanation: 'Informe quanto seu negócio costuma receber com todas as vendas em um mês, antes de pagar qualquer conta. Esse é o faturamento, não o dinheiro que sobra.',
    example: 'Se você vende 100 produtos por R$ 10 cada durante o mês, seu faturamento é R$ 1.000, mesmo que parte desse dinheiro vá para as contas.',
    effect: 'Esse valor ajuda a dividir as contas fixas entre as vendas. Com as mesmas contas, um faturamento maior reduz a parte reservada por venda e pode diminuir o preço calculado. Use uma média realista e maior que zero.',
  },
  variableExpenses: {
    explanation: 'Informe a porcentagem da venda que vai para taxas ou comissões. Some as porcentagens que se aplicam à venda. Não inclua custos que você já colocou nos outros campos.',
    example: 'Se a taxa da maquininha é 3% e a comissão é 2%, preencha 5. Em uma venda de R$ 20, esses 5% representam R$ 1.',
    effect: 'Quanto maiores as taxas, maior precisa ser o preço para cobri-las. Se não pagar taxas nem comissões, informe 0.',
  },
  profit: {
    explanation: 'Escolha a porcentagem do preço de venda que você quer que sobre para o negócio depois de pagar os materiais, o trabalho e as despesas.',
    example: 'Com lucro de 20%, em uma venda de R$ 10 a calculadora reserva R$ 2 como lucro. Não é apenas somar 20% ao custo.',
    effect: 'Quanto maior o lucro desejado, maior o preço calculado. A soma do lucro com as porcentagens das despesas fixas e variáveis precisa ficar abaixo de 100%.',
  },
}

const steps = fieldGroups.map(group => group.title)
const stepForField = (name: Field) => fieldGroups.findIndex(group => group.fields.some(field => field.name === name))

export default function PricingCalculatorPage() {
  const [activeMethod, setActiveMethod] = useState<CalculatorMethod>('main')
  const tabRefs = useRef<Partial<Record<CalculatorMethod, HTMLButtonElement | null>>>({})
  const [values, setValues] = useState<FormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [step, setStep] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const numbers = {
    materialCost: parsePricingNumber(values.materialCost),
    productionHours: parseProductionHours(values.productionHours, values.timeUnit),
    hourlyRate: parsePricingNumber(values.hourlyRate),
    monthlyFixedExpenses: parsePricingNumber(values.monthlyFixedExpenses),
    monthlyRevenue: parsePricingNumber(values.monthlyRevenue),
    variableExpenses: parsePricingNumber(values.variableExpenses),
    profit: parsePricingNumber(values.profit),
  }
  const errors = Object.fromEntries(fields.map(({ name }) => {
    const value = numbers[name]
    let error = ''
    if (value === null) error = values[name].trim() ? 'Informe um número válido, maior ou igual a zero. Ex.: 1000,50 ou 1.000,50.' : 'Preencha este campo.'
    else if (name === 'monthlyRevenue' && value <= 0) error = 'Informe um faturamento maior que zero.'
    else if ((name === 'variableExpenses' || name === 'profit') && value >= 100) error = 'Informe um percentual menor que 100%.'
    return [name, error]
  })) as Record<Field, string>

  const { materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit } = numbers
  const fixedRatio = monthlyFixedExpenses !== null && monthlyRevenue !== null && monthlyRevenue > 0
    ? monthlyFixedExpenses / monthlyRevenue * 100 : null
  const fixedPercentage = fixedRatio !== null && Number.isFinite(fixedRatio) ? fixedRatio : null
  const totalPercentage = fixedPercentage !== null && variableExpenses !== null && profit !== null
    ? fixedPercentage + variableExpenses + profit : null
  const invalidTotal = totalPercentage !== null && totalPercentage >= 100
  const directCost = materialCost !== null && productionHours !== null && hourlyRate !== null
    ? materialCost + productionHours * hourlyRate : null
  if (directCost === 0) errors.materialCost = 'O custo de material mais a mão de obra deve ser maior que zero.'

  const calculated = materialCost !== null && productionHours !== null && hourlyRate !== null && monthlyFixedExpenses !== null
    && monthlyRevenue !== null && variableExpenses !== null && profit !== null
    ? calculateMarkup({ materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit }) : null
  const hasFieldErrors = fields.some(({ name }) => Boolean(errors[name]))
  const result = !hasFieldErrors ? calculated : null
  const calculationError = !hasFieldErrors && !invalidTotal && !calculated
    ? 'Os valores informados são grandes demais para calcular. Reduza os valores e tente novamente.' : ''
  const isExample = result !== null && values.timeUnit === exampleValues.timeUnit && fields.every(({ name }) => values[name] === exampleValues[name])
  const breakdown = result ? [
    { label: 'Materiais', detail: 'Por unidade', amount: result.materialCost, className: 'materials' },
    { label: 'Mão de obra', detail: `${decimal.format(result.productionHours)} ${result.productionHours === 1 ? 'hora' : 'horas'} × ${currency.format(result.hourlyRate)}`, amount: result.laborCost, className: 'labor' },
    { label: 'Despesas fixas', detail: `${formatPercentage(result.fixedPercentage)}% do preço`, amount: result.fixedExpensesAmount, className: 'fixed' },
    { label: 'Despesas variáveis', detail: `${formatPercentage(result.variableExpenses)}% do preço`, amount: result.variableExpensesAmount, className: 'variable' },
    { label: 'Lucro desejado', detail: `${formatPercentage(result.profit)}% do preço`, amount: result.profitAmount, className: 'profit' },
  ] : []

  function selectMethod(method: CalculatorMethod) {
    setActiveMethod(method)
    tabRefs.current[method]?.focus()
  }

  function navigateMethods(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % calculatorMethods.length; break
      case 'ArrowLeft': nextIndex = (index - 1 + calculatorMethods.length) % calculatorMethods.length; break
      case 'Home': nextIndex = 0; break
      case 'End': nextIndex = calculatorMethods.length - 1; break
      default: return
    }
    event.preventDefault()
    selectMethod(calculatorMethods[nextIndex].id)
  }

  function updateValue(name: Field, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }))
    setTouched(previous => ({ ...previous, [name]: true }))
  }

  function showStep(target: number, name?: Field) {
    setStep(target)
    requestAnimationFrame(() => {
      const field = name ? formRef.current?.elements.namedItem(name)
        : formRef.current?.querySelector(`fieldset[data-step="${target}"] legend`)
      if (field instanceof HTMLElement) field.focus()
    })
  }

  function goToStep(target: number) {
    const firstInvalid = target > step ? fields.find(({ name }) => stepForField(name) < target && errors[name])?.name : undefined
    if (firstInvalid) {
      const invalidStep = stepForField(firstInvalid)
      setTouched(previous => ({ ...previous, ...Object.fromEntries(fieldGroups[invalidStep].fields.map(field => [field.name, true])) }))
      showStep(invalidStep, firstInvalid)
      return
    }
    showStep(target)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < steps.length - 1) {
      goToStep(step + 1)
      return
    }
    const firstInvalid = fields.find(({ name }) => errors[name])?.name
      ?? (invalidTotal ? 'profit' : calculationError ? 'materialCost' : null)
    if (firstInvalid) {
      setTouched(previous => ({ ...previous, [firstInvalid]: true }))
      showStep(stepForField(firstInvalid), firstInvalid)
    }
  }

  function useExample() {
    setValues(exampleValues)
    setTouched({})
    setStep(0)
  }

  function clearFields() {
    setValues({
      materialCost: '', productionHours: '', hourlyRate: '', monthlyFixedExpenses: '',
      monthlyRevenue: '', variableExpenses: '0', profit: '0', timeUnit: 'hour',
    })
    setTouched({})
    showStep(0, 'materialCost')
  }

  return (
    <>
      <Header initialActiveLink="#/calculadora" />
      <main className="markup-page">
        <div className="markup-shell">
          <header className="markup-heading">
            <span className="markup-heading-icon"><Icon name="calculator" /></span>
            <div>
              <h1>Calculadora de precificação</h1>
              <p>Valorize seu trabalho. Encontre um preço que cubra seus custos e seu lucro.</p>
            </div>
          </header>

          <div className="markup-calculator-tabs" role="tablist" aria-label="Metodologia de precificação">
            {calculatorMethods.map((method, index) => (
              <button
                key={method.id}
                ref={(element) => { tabRefs.current[method.id] = element }}
                className="markup-calculator-tab"
                type="button"
                role="tab"
                id={`markup-tab-${method.id}`}
                aria-controls={`markup-panel-${method.id}`}
                aria-selected={activeMethod === method.id}
                tabIndex={activeMethod === method.id ? 0 : -1}
                onClick={() => selectMethod(method.id)}
                onKeyDown={(event) => navigateMethods(event, index)}
              >
                <Icon name={method.icon} />
                <span>{method.label}</span>
              </button>
            ))}
          </div>

          <div
            className="markup-calculator-panel"
            role="tabpanel"
            id="markup-panel-main"
            aria-labelledby="markup-tab-main"
            hidden={activeMethod !== 'main'}
            tabIndex={0}
          >
            <div className="markup-layout">
              <section className="markup-form-panel" aria-labelledby="markup-form-title">
                <div className="markup-panel-heading">
                  <h2 id="markup-form-title">Vamos calcular?</h2>
                  <button className="markup-example" type="button" onClick={useExample}>Usar exemplo</button>
                </div>

                <p className="markup-help-intro">Preencha um tópico por vez e use Voltar e Próximo para revisar. Toque na interrogação (?) para entender cada campo e ver um exemplo.</p>
                <form ref={formRef} className="markup-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                  <CalculatorSteps steps={steps} current={step} onSelect={goToStep} label="Etapas da calculadora simples" />
                  {fieldGroups.map((group, index) => (
                    <fieldset className="markup-field-group" key={group.title} data-step={index} hidden={step !== index}>
                      <legend tabIndex={-1}><Icon name={group.icon} /> {index + 1}. {group.title}</legend>
                      {group.fields.map(({ name, label, unit, hint, placeholder }) => {
                        const error = touched[name] ? errors[name] : ''
                        const hasTotalError = percentageFields.includes(name) && invalidTotal
                        if (unit === '%') return <PercentageField key={name} id={`markup-${name}`} name={name}
                          label={label} value={values[name]} onChange={value => updateValue(name, value)}
                          onBlur={() => setTouched(previous => ({ ...previous, [name]: true }))}
                          hint={hint} error={error} invalid={hasTotalError}
                          describedBy={hasTotalError ? 'markup-total-error' : undefined}
                          help={<CalculatorFieldHelp label={label} help={fieldHelp[name]} />} />
                        const inputField = (
                          <div className="markup-field" key={name}>
                            <div className="markup-field-heading">
                              <label htmlFor={`markup-${name}`}>{label}</label>
                              <CalculatorFieldHelp label={label} help={fieldHelp[name]} />
                            </div>
                            <div className={`markup-input-wrap${error ? ' has-error' : ''}`}>
                              {unit === 'R$' && <span id={`markup-${name}-unit`}>R$</span>}
                              <input
                                id={`markup-${name}`}
                                name={name}
                                type="text"
                                inputMode="decimal"
                                maxLength={20}
                                value={values[name]}
                                placeholder={name === 'productionHours' && values.timeUnit === 'minute' ? 'Ex.: 30' : placeholder}
                                required
                                aria-invalid={Boolean(error) || hasTotalError}
                                aria-describedby={`markup-${name}-unit markup-${name}-hint${error ? ` markup-${name}-error` : ''}${hasTotalError ? ' markup-total-error' : ''}`}
                                onChange={(event) => {
                                  updateValue(name, event.currentTarget.value)
                                }}
                                onBlur={() => setTouched((previous) => ({ ...previous, [name]: true }))}
                              />
                              {unit !== 'R$' && <span id={`markup-${name}-unit`}>{name === 'productionHours' && values.timeUnit === 'minute' ? 'minutos' : unit}</span>}
                            </div>
                            <p id={`markup-${name}-hint`} className="markup-hint">{name === 'productionHours' ? `Tempo gasto para produzir uma unidade, em ${values.timeUnit === 'minute' ? 'minutos' : 'horas'}.` : hint}</p>
                            {error && <p id={`markup-${name}-error`} className="markup-error">{error}</p>}
                          </div>
                        )
                        return name === 'productionHours' ? (
                          <div className="markup-time-fields" key={name}>
                            {inputField}
                            <ProductionTimeUnitField id="markup-timeUnit" value={values.timeUnit}
                              onChange={timeUnit => setValues(previous => ({ ...previous, timeUnit }))} />
                          </div>
                        ) : inputField
                      })}
                      {group.icon === 'store' && (
                        <>
                          <div className="markup-fixed-percentage">
                            <span>Despesas fixas ÷ faturamento × 100</span>
                            <strong>{fixedPercentage !== null ? `${formatPercentage(fixedPercentage)}%` : '—'}</strong>
                          </div>
                          {monthlyFixedExpenses === 0 && <p id="markup-revenue-effect" className="markup-hint">Sem despesas fixas mensais, mudar o faturamento não altera o preço sugerido.</p>}
                        </>
                      )}
                    </fieldset>
                  ))}

                  <div className="markup-total-section" hidden={step !== steps.length - 1}>
                    <div className={`markup-total${invalidTotal ? ' has-error' : ''}`}>
                      <span>{totalPercentage !== null
                        ? `Fixas ${formatPercentage(fixedPercentage!)}% + variáveis ${formatPercentage(variableExpenses!)}% + lucro ${formatPercentage(profit!)}%`
                        : 'Despesas fixas + variáveis + lucro'}</span>
                      <strong>{totalPercentage !== null ? `${formatPercentage(totalPercentage)}%` : '—'}</strong>
                    </div>
                    {invalidTotal ? (
                      <p id="markup-total-error" className="markup-error" role="alert">A soma deve ficar abaixo de 100%. Revise as despesas, o faturamento ou o lucro desejado.</p>
                    ) : <p className="markup-hint">A soma deve ficar abaixo de 100% para calcular o preço.</p>}
                    {calculationError && <p className="markup-error" role="alert">{calculationError}</p>}
                  </div>
                  <CalculatorStepActions current={step} count={steps.length} onBack={() => showStep(step - 1)} onClear={clearFields} />
                </form>
              </section>

              <aside className="markup-result-panel" aria-labelledby="markup-result-title">
                <div className="markup-result-card">
                  <div className="markup-result-heading">
                    <span className="markup-step">SEU RESULTADO</span>
                    {isExample && <span className="markup-example-badge">Exemplo preenchido</span>}
                  </div>
                  <h2 id="markup-result-title">Preço de venda por unidade</h2>
                  <div className="markup-price-area" role="status" aria-live="polite" aria-atomic="true">
                    <strong className="markup-price">{result ? currency.format(result.price) : 'R$ —'}</strong>
                    <p>{result ? 'Preço atualizado com os custos e percentuais informados.' : invalidTotal
                      ? 'Ajuste os percentuais para ver o preço.' : 'Preencha ou corrija os campos necessários para ver seu preço.'}</p>
                    <p>O resultado é atualizado automaticamente conforme você preenche os campos.</p>
                  </div>
                  <div className="markup-multiplier"><span>Multiplicador markup</span><strong>{result ? `${decimal.format(result.multiplier)}×` : '—'}</strong></div>
                </div>

                <section className="markup-breakdown" aria-labelledby="markup-breakdown-title">
                  <h3 id="markup-breakdown-title">Para onde vai cada parte do preço?</h3>
                  <p className="markup-hint">Distribuição do valor de uma unidade vendida.</p>
                  {result ? (
                    <>
                      <div className="markup-bar" aria-hidden="true">{breakdown.map((item) => <span key={item.className} className={item.className} style={{ width: `${item.amount / result.price * 100}%` }} />)}</div>
                      <dl>{breakdown.map((item) => (
                        <div key={item.className}>
                          <dt><span className={`markup-dot ${item.className}`} /><span className="markup-breakdown-label">{item.label}<small>{item.detail}</small></span></dt>
                          <dd>{currency.format(item.amount)}</dd>
                        </div>
                      ))}</dl>
                      <div className="markup-breakdown-total"><span>Preço de venda</span><strong>{currency.format(result.price)}</strong></div>
                      <p className="markup-hint">Valores arredondados para duas casas decimais.</p>
                    </>
                  ) : <p className="markup-empty">Preencha os dados para ver os materiais, a mão de obra, as despesas e o lucro de cada unidade.</p>}
                </section>
                <p className="markup-local-note"><Icon name="shieldCheck" /><span>Seus valores ajudam a planejar uma venda que remunera seu trabalho e mantém o negócio saudável.</span></p>
              </aside>
            </div>

            <section className="markup-guide" aria-labelledby="markup-guide-title">
              <h2 id="markup-guide-title"><Icon name="information" /> Como chegamos a esse preço</h2>
              <p className="markup-formula">Preço = [(material + horas × valor da hora) × 100] ÷ [100 − ((despesas fixas mensais ÷ faturamento mensal × 100) + variáveis % + lucro %)]</p>
              <div className="markup-guide-steps">
                <div>
                  <h3>Custo direto por unidade</h3>
                  <p>{result ? `${currency.format(result.materialCost)} + (${decimal.format(result.productionHours)} h × ${currency.format(result.hourlyRate)})` : 'Material + (horas × valor da hora)'}</p>
                  <strong>{result ? currency.format(result.directCost) : 'R$ —'}</strong>
                  <p className="markup-hint">Material + mão de obra, sem duplicar custos.</p>
                </div>
                <div>
                  <h3>Percentuais sobre a venda</h3>
                  <p>{result ? `${formatPercentage(result.fixedPercentage)}% fixas + ${formatPercentage(result.variableExpenses)}% variáveis + ${formatPercentage(result.profit)}% lucro` : 'Fixas % + variáveis % + lucro %'}</p>
                  <strong>{result ? `${formatPercentage(result.totalPercentage)}%` : '—'}</strong>
                  <p className="markup-hint">{result ? `Fixas = ${currency.format(result.monthlyFixedExpenses)} ÷ ${currency.format(result.monthlyRevenue)} × 100.` : 'Fixas = despesas fixas mensais ÷ faturamento mensal × 100.'}</p>
                </div>
                <div>
                  <h3>Preço de venda por unidade</h3>
                  <p>{result ? `(${currency.format(result.directCost)} × 100) ÷ (100 − ${formatPercentage(result.totalPercentage)})` : '(Custo direto × 100) ÷ (100 − percentuais)'}</p>
                  <strong>{result ? currency.format(result.price) : 'R$ —'}</strong>
                  <p className="markup-hint">{result ? `Divisor de ${formatPercentage(100 - result.totalPercentage)}%: a parcela que cobre o custo direto.` : 'A parcela restante do preço cobre o custo direto.'}</p>
                </div>
              </div>
            </section>
            <p className="markup-disclaimer">Simulação ilustrativa por unidade. Ajuste os valores à realidade do seu negócio.</p>
          </div>

          <div
            className="markup-calculator-panel"
            role="tabpanel"
            id="markup-panel-advanced"
            aria-labelledby="markup-tab-advanced"
            hidden={activeMethod !== 'advanced'}
            tabIndex={0}
          >
            <AdvancedPricingCalculator />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
