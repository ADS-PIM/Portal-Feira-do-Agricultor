import { useRef, useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { calculateIngredient, PRICING_UNITS, type PricingUnit } from '../../utils/advancedPricingCalculator'
import { parsePricingNumber } from '../../utils/pricingCalculator'
import { emptyAdvancedForm, evaluateAdvancedForm, exampleAdvancedForm, newEquipment, newExpense, newIngredient,
  type AdvancedFormValues, type EquipmentDraft, type ExpenseDraft, type IngredientDraft } from './advancedPricingForm'
import './AdvancedPricingCalculator.css'
import PercentageField from './PercentageField'
import { CalculatorSteps, CalculatorStepActions } from './CalculatorSteps'
import CalculatorFieldHelp from './CalculatorFieldHelp'
import { getAdvancedFieldHelp } from './advancedFieldHelp'

const steps = ['Produto', 'Insumos', 'Trabalho', 'Gastos fixos', 'Equipamentos', 'Taxas e lucro'] as const
function stepForField(name: string) {
  if (['productName', 'producedQuantity', 'productionTime', 'timeUnit'].includes(name)) return 0
  if (name.startsWith('ingredients')) return 1
  if (['monthlyPay', 'hoursPerDay', 'daysPerMonth'].includes(name)) return 2
  if (name.startsWith('fixedExpenses')) return 3
  if (name.startsWith('equipment')) return 4
  return 5
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const preciseDecimal = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 17 })
const money = (value: number) => Number.isFinite(value) ? currency.format(value) : 'R$ —'
const numeric = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(4))
  return ((value > 0 && rounded === 0) || (value < 100 && rounded === 100) ? preciseDecimal : decimal).format(value)
}
const unitOptions = Object.entries(PRICING_UNITS).map(([value, unit]) => ({ value, label: unit.label }))

type FieldProps = {
  name: string; label: string; value: string; onChange: (value: string) => void
  error?: string; hint?: string; unit?: string; text?: boolean; placeholder?: string
}

function AdvancedField({ name, label, value, onChange, error, hint, unit, text, placeholder }: FieldProps) {
  const id = `advanced-${name}`
  const help = getAdvancedFieldHelp(name)
  const helpButton = help ? <CalculatorFieldHelp label={label} help={help} /> : undefined
  if (unit === '%') return <PercentageField id={id} name={name} label={label} value={value}
    onChange={onChange} error={error} hint={hint} help={helpButton} />
  return (
    <div className="markup-field">
      <div className="markup-field-heading"><label htmlFor={id}>{label}</label>{helpButton}</div>
      <div className={`markup-input-wrap${error ? ' has-error' : ''}`}>
        {unit === 'R$' && <span aria-hidden="true">R$</span>}
        <input id={id} name={name} type="text" inputMode={text ? 'text' : 'decimal'} value={value}
          maxLength={text ? 120 : 20} placeholder={placeholder} aria-invalid={Boolean(error)}
          aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
          onChange={event => onChange(event.currentTarget.value)} />
        {unit && unit !== 'R$' && <span aria-hidden="true">{unit}</span>}
      </div>
      {hint && <p id={`${id}-hint`} className="markup-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="markup-error">{error}</p>}
    </div>
  )
}

function AdvancedSelect({ name, label, value, options, onChange, error }: {
  name: string; label: string; value: string; options: { value: string; label: string }[]
  onChange: (value: string) => void; error?: string
}) {
  const id = `advanced-${name}`
  const help = getAdvancedFieldHelp(name)
  return (
    <div className="markup-field">
      <div className="markup-field-heading"><label htmlFor={id}>{label}</label>{help && <CalculatorFieldHelp label={label} help={help} />}</div>
      <select id={id} name={name} value={value} onChange={event => onChange(event.currentTarget.value)}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <p id={`${id}-error`} className="markup-error">{error}</p>}
    </div>
  )
}

function RemoveRow({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <button className="advanced-remove" type="button" aria-label={label} disabled={disabled} onClick={onClick}><Icon name="trash" /></button>
}

export default function AdvancedPricingCalculator() {
  const [values, setValues] = useState<AdvancedFormValues>(emptyAdvancedForm)
  const [submitted, setSubmitted] = useState(false)
  const [hasCalculated, setHasCalculated] = useState(false)
  const [isExample, setIsExample] = useState(false)
  const [step, setStep] = useState(0)
  const [attemptedSteps, setAttemptedSteps] = useState<number[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const validation = evaluateAdvancedForm(values)
  const result = hasCalculated ? validation.result : null
  const error = (name: string) => hasCalculated || attemptedSteps.includes(stepForField(name)) ? validation.errors[name] : undefined
  const currentErrors = Object.keys(validation.errors).filter(name => stepForField(name) === step)

  function showStep(target: number, fieldName?: string) {
    setStep(target)
    requestAnimationFrame(() => {
      const field = fieldName ? formRef.current?.elements.namedItem(fieldName)
        : formRef.current?.querySelector(`fieldset[data-step="${target}"] legend`)
      if (field instanceof HTMLElement) field.focus()
    })
  }
  function goToStep(target: number) {
    if (target > step) {
      const invalid = Object.keys(validation.errors).sort((a, b) => stepForField(a) - stepForField(b))
        .find(name => stepForField(name) < target)
      if (invalid) {
        const invalidStep = stepForField(invalid)
        setAttemptedSteps(previous => [...new Set([...previous, invalidStep])])
        showStep(invalidStep, invalid)
        return
      }
    }
    showStep(target)
  }

  function update<K extends keyof AdvancedFormValues>(name: K, value: AdvancedFormValues[K]) {
    setValues(previous => ({ ...previous, [name]: value }))
    setIsExample(false)
  }
  function updateIngredient(id: string, patch: Partial<IngredientDraft>) {
    update('ingredients', values.ingredients.map(row => row.id === id ? { ...row, ...patch } : row))
  }
  function updateExpense(group: 'fixedExpenses' | 'variableExpenses', id: string, patch: Partial<ExpenseDraft>) {
    update(group, values[group].map(row => row.id === id ? { ...row, ...patch } : row))
  }
  function updateEquipment(id: string, patch: Partial<EquipmentDraft>) {
    update('equipment', values.equipment.map(row => row.id === id ? { ...row, ...patch } : row))
  }
  function useExample() {
    const example = exampleAdvancedForm()
    setValues(example)
    setSubmitted(false)
    setIsExample(true)
    setStep(0)
    setAttemptedSteps([])
    setHasCalculated(true)
  }
  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < steps.length - 1) {
      goToStep(step + 1)
      return
    }
    setSubmitted(true)
    if (validation.result) {
      setHasCalculated(true)
      requestAnimationFrame(() => resultRef.current?.focus())
    } else {
      const name = Object.keys(validation.errors).sort((a, b) => stepForField(a) - stepForField(b))[0]
      const invalidStep = stepForField(name)
      setAttemptedSteps(previous => [...new Set([...previous, invalidStep])])
      showStep(invalidStep, name === 'calculation' ? undefined : name)
    }
  }
  function clear() {
    setValues(emptyAdvancedForm())
    setSubmitted(false)
    setHasCalculated(false)
    setIsExample(false)
    setStep(0)
    setAttemptedSteps([])
    requestAnimationFrame(() => (formRef.current?.elements.namedItem('productName') as HTMLInputElement)?.focus())
  }
  function baseField(name: 'productName' | 'producedQuantity' | 'productionTime' | 'monthlyPay'
    | 'hoursPerDay' | 'daysPerMonth' | 'monthlyRevenue' | 'profit', label: string, props: Partial<FieldProps> = {}) {
    return <AdvancedField name={name} label={label} value={values[name]} onChange={value => update(name, value)} error={error(name)} {...props} />
  }
  const breakdown = result ? [
    { label: 'Materiais por unidade', amount: result.materialCost, className: 'materials' },
    { label: 'Mão de obra por unidade', amount: result.laborCost, className: 'labor' },
    { label: 'Despesas fixas', amount: result.fixedExpensesAmount, className: 'fixed' },
    { label: 'Despesas variáveis', amount: result.variableExpensesAmount, className: 'variable' },
    { label: 'Lucro desejado', amount: result.profitAmount, className: 'profit' },
  ] : []

  return (
    <div className="advanced-calculator">
      <div className="markup-layout">
        <section className="markup-form-panel" aria-labelledby="advanced-form-title">
          <div className="markup-panel-heading">
            <h2 id="advanced-form-title">Vamos detalhar seus custos?</h2>
            <button className="markup-example" type="button" onClick={useExample}>Usar exemplo</button>
          </div>
          <p className="markup-help-intro">Preencha um tópico por vez. Use Voltar e Próximo para revisar seus custos e toque na interrogação (?) para entender os campos e ver exemplos. Os valores ficam preservados entre as etapas.</p>
          <form ref={formRef} className="markup-form" onSubmit={calculate} noValidate autoComplete="off">
            <CalculatorSteps steps={steps} current={step} onSelect={goToStep} />
            <fieldset className="markup-field-group" data-step="0" hidden={step !== 0}>
              <legend tabIndex={-1}><Icon name="box" /> 1. Seu produto e a receita</legend>
              <div className="advanced-field-grid">
                {baseField('productName', 'Nome do produto', { text: true, placeholder: 'Ex.: pão recheado' })}
                {baseField('producedQuantity', 'Quantidade produzida por receita', { placeholder: 'Ex.: 2', hint: 'Quantidade pronta para vender, depois das perdas.' })}
                {baseField('productionTime', 'Tempo total de trabalho na receita', { placeholder: 'Ex.: 2', hint: 'Informe o tempo de trabalho dedicado a todo o lote.' })}
                <AdvancedSelect name="timeUnit" label="Medida do tempo de produção" value={values.timeUnit}
                  options={[{ value: 'hour', label: 'Horas' }, { value: 'minute', label: 'Minutos' }]}
                  onChange={value => update('timeUnit', value as 'hour' | 'minute')} />
              </div>
            </fieldset>

            <fieldset className="markup-field-group" data-step="1" hidden={step !== 1}>
              <legend tabIndex={-1}><Icon name="seedling" /> 2. Insumos e embalagens</legend>
              <p className="markup-hint advanced-section-hint">Cadastre cada ingrediente, embalagem ou consumo de gás usado na receita. O valor pago deve corresponder a toda a quantidade comprada informada.</p>
              <div className="advanced-rows">
                {values.ingredients.map((row, index) => {
                  const key = `ingredients.${row.id}`
                  const preview = calculateIngredient({ ...row, purchasedQuantity: parsePricingNumber(row.purchasedQuantity) ?? NaN,
                    purchaseValue: parsePricingNumber(row.purchaseValue) ?? NaN, usedQuantity: parsePricingNumber(row.usedQuantity) ?? NaN,
                    packageQuantity: parsePricingNumber(row.packageQuantity) ?? NaN })
                  return (
                    <div className="advanced-item" key={row.id}>
                      <div className="advanced-item-heading"><h3>Insumo {index + 1}</h3><RemoveRow label={`Remover insumo ${index + 1}`} disabled={values.ingredients.length === 1}
                        onClick={() => update('ingredients', values.ingredients.filter(item => item.id !== row.id))} /></div>
                      <AdvancedField name={`${key}.name`} label="Nome do insumo" text value={row.name} error={error(`${key}.name`)}
                        placeholder="Ex.: farinha de trigo" onChange={name => updateIngredient(row.id, { name })} />
                      <div className="advanced-field-grid">
                        <AdvancedField name={`${key}.purchasedQuantity`} label="Quantidade comprada" value={row.purchasedQuantity} error={error(`${key}.purchasedQuantity`)}
                          placeholder="Ex.: 1" onChange={purchasedQuantity => updateIngredient(row.id, { purchasedQuantity })} />
                        <AdvancedSelect name={`${key}.purchasedUnit`} label="Medida da compra" value={row.purchasedUnit}
                          options={[...unitOptions, { value: 'package', label: 'Pacote / botijão' }]}
                          onChange={purchasedUnit => updateIngredient(row.id, { purchasedUnit: purchasedUnit as IngredientDraft['purchasedUnit'] })} />
                        <AdvancedField name={`${key}.purchaseValue`} label="Valor total pago na compra" unit="R$" value={row.purchaseValue} error={error(`${key}.purchaseValue`)}
                          placeholder="Ex.: 4,80" onChange={purchaseValue => updateIngredient(row.id, { purchaseValue })} />
                      </div>
                      {row.purchasedUnit === 'package' && (
                        <div className="advanced-package">
                          <p className="markup-hint">Quanto vem ou quanto dura cada pacote/botijão? Para gás, informe a duração estimada nas mesmas condições de uso, como 320 horas por botijão.</p>
                          <div className="advanced-field-grid">
                            <AdvancedField name={`${key}.packageQuantity`} label="Conteúdo ou duração de cada pacote" value={row.packageQuantity} error={error(`${key}.packageQuantity`)}
                              onChange={packageQuantity => updateIngredient(row.id, { packageQuantity })} />
                            <AdvancedSelect name={`${key}.packageUnit`} label="Medida do conteúdo ou duração" value={row.packageUnit} options={unitOptions}
                              onChange={packageUnit => updateIngredient(row.id, { packageUnit: packageUnit as PricingUnit })} />
                          </div>
                        </div>
                      )}
                      <div className="advanced-field-grid">
                        <AdvancedField name={`${key}.usedQuantity`} label="Quantidade usada na receita" value={row.usedQuantity} error={error(`${key}.usedQuantity`)}
                          placeholder="Ex.: 500" onChange={usedQuantity => updateIngredient(row.id, { usedQuantity })} />
                        <AdvancedSelect name={`${key}.usedUnit`} label="Medida usada na receita" value={row.usedUnit} options={unitOptions} error={error(`${key}.usedUnit`)}
                          onChange={usedUnit => updateIngredient(row.id, { usedUnit: usedUnit as PricingUnit })} />
                      </div>
                      <div className="advanced-item-summary">
                        <span>Rende <strong>{preview ? numeric(preview.recipeYield) : '—'}</strong> receitas</span>
                        <span>Custo nesta receita <strong>{preview ? money(preview.cost) : 'R$ —'}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="advanced-add" type="button" onClick={() => update('ingredients', [...values.ingredients, newIngredient()])}><Icon name="plus" /> Adicionar insumo</button>
            </fieldset>

            <fieldset className="markup-field-group" data-step="2" hidden={step !== 2}>
              <legend tabIndex={-1}><Icon name="clock" /> 3. Valor do seu trabalho</legend>
              <div className="advanced-field-grid">
                {baseField('monthlyPay', 'Quanto quer receber por mês pelo trabalho?', { unit: 'R$', placeholder: 'Ex.: 1.600,00', hint: 'Sua remuneração pelo trabalho, separada do lucro do negócio.' })}
                {baseField('hoursPerDay', 'Horas produtivas por dia', { unit: 'h', placeholder: 'Ex.: 8', hint: 'Somente horas dedicadas à produção, até 24 por dia.' })}
                {baseField('daysPerMonth', 'Dias trabalhados no mês', { unit: 'dias', placeholder: 'Ex.: 20' })}
              </div>
              <p className="markup-hint">Horas por mês = horas produtivas por dia × dias trabalhados. Valor da hora = remuneração mensal ÷ horas produtivas mensais.</p>
            </fieldset>

            <fieldset className="markup-field-group" data-step="3" hidden={step !== 3}>
              <legend tabIndex={-1}><Icon name="store" /> 4. Gastos fixos mensais</legend>
              <p className="markup-hint advanced-section-hint">Inclua a parte do aluguel, internet e outras contas destinada ao negócio. Evite repetir insumos, gás ou trabalho já contabilizados.</p>
              {values.fixedExpenses.map((row, index) => (
                <div className="advanced-expense-row" key={row.id}>
                  <AdvancedField name={`fixedExpenses.${row.id}.name`} label={`Gasto fixo ${index + 1}`} text value={row.name} error={error(`fixedExpenses.${row.id}.name`)}
                    placeholder="Ex.: aluguel" onChange={name => updateExpense('fixedExpenses', row.id, { name })} />
                  <AdvancedField name={`fixedExpenses.${row.id}.value`} label="Valor mensal" unit="R$" value={row.value} error={error(`fixedExpenses.${row.id}.value`)}
                    onChange={value => updateExpense('fixedExpenses', row.id, { value })} />
                  <RemoveRow label={`Remover gasto fixo ${index + 1}`} onClick={() => update('fixedExpenses', values.fixedExpenses.filter(item => item.id !== row.id))} />
                </div>
              ))}
              <button className="advanced-add" type="button" onClick={() => update('fixedExpenses', [...values.fixedExpenses, newExpense()])}><Icon name="plus" /> Adicionar gasto fixo</button>
            </fieldset>

            <fieldset className="markup-field-group" data-step="4" hidden={step !== 4}>
              <legend tabIndex={-1}><Icon name="sliders" /> 5. Desgaste dos equipamentos</legend>
              <p className="markup-hint advanced-section-hint">A depreciação mensal é o valor atual do equipamento dividido pelos meses que ele ainda deve durar. Ela será somada aos gastos fixos.</p>
              {values.equipment.map((row, index) => (
                <div className="advanced-item" key={row.id}>
                  <div className="advanced-item-heading"><h3>Equipamento {index + 1}</h3><RemoveRow label={`Remover equipamento ${index + 1}`} onClick={() => update('equipment', values.equipment.filter(item => item.id !== row.id))} /></div>
                  <AdvancedField name={`equipment.${row.id}.name`} label="Nome do equipamento" text value={row.name} error={error(`equipment.${row.id}.name`)}
                    placeholder="Ex.: forno" onChange={name => updateEquipment(row.id, { name })} />
                  <div className="advanced-field-grid">
                    <AdvancedField name={`equipment.${row.id}.value`} label="Quanto vale hoje?" unit="R$" value={row.value} error={error(`equipment.${row.id}.value`)}
                      onChange={value => updateEquipment(row.id, { value })} />
                    <AdvancedField name={`equipment.${row.id}.lifeMonths`} label="Quantos meses ainda deve durar?" unit="meses" value={row.lifeMonths} error={error(`equipment.${row.id}.lifeMonths`)}
                      onChange={lifeMonths => updateEquipment(row.id, { lifeMonths })} />
                  </div>
                  <p className="markup-fixed-percentage"><span>Depreciação mensal</span><strong>{money((parsePricingNumber(row.value) ?? NaN) / ((parsePricingNumber(row.lifeMonths) ?? 0) || NaN))}</strong></p>
                </div>
              ))}
              <button className="advanced-add" type="button" onClick={() => update('equipment', [...values.equipment, newEquipment()])}><Icon name="plus" /> Adicionar equipamento</button>
              <p className="markup-hint">Sem equipamentos ou contas fixas para incluir? Você pode deixar essas listas vazias.</p>
            </fieldset>

            <fieldset className="markup-field-group" data-step="5" hidden={step !== 5}>
              <legend tabIndex={-1}><Icon name="percent" /> 6. Faturamento, taxas e lucro</legend>
              {baseField('monthlyRevenue', 'Faturamento médio mensal', { unit: 'R$', placeholder: 'Ex.: 10.000,00', hint: 'Total médio recebido com as vendas, antes de pagar as contas. Deve ser maior que zero.' })}
              <div className="markup-fixed-percentage"><span>Gastos fixos com depreciação / mês</span><strong>{money(validation.monthlyFixed)}</strong></div>
              <div className="markup-fixed-percentage"><span>Percentual de gastos fixos sobre as vendas</span><strong>{numeric(validation.fixedPercentage)}%</strong></div>
              <p id="advanced-revenue-effect" className="markup-hint">{validation.monthlyFixed === 0
                ? 'Sem gastos fixos ou depreciação, mudar o faturamento não altera o preço sugerido.'
                : Number.isFinite(validation.fixedPercentage)
                  ? `${money(validation.monthlyFixed)} de gastos fixos ÷ ${money(validation.input.monthlyRevenue)} de faturamento × 100 = ${numeric(validation.fixedPercentage)}%. Esse percentual entra no markup.`
                  : 'O faturamento distribui os gastos fixos entre as vendas. Ele altera o percentual de gastos fixos usado no markup.'}</p>
              <p className="markup-hint advanced-section-hint">Cadastre taxas e comissões em porcentagem do preço de venda. Por exemplo, maquininha 3% e comissão 2%.</p>
              {values.variableExpenses.map((row, index) => (
                <div className="advanced-expense-row" key={row.id}>
                  <AdvancedField name={`variableExpenses.${row.id}.name`} label={`Despesa variável ${index + 1}`} text value={row.name} error={error(`variableExpenses.${row.id}.name`)}
                    placeholder="Ex.: taxa da maquininha" onChange={name => updateExpense('variableExpenses', row.id, { name })} />
                  <AdvancedField name={`variableExpenses.${row.id}.value`} label="Percentual sobre a venda" unit="%" value={row.value} error={error(`variableExpenses.${row.id}.value`)}
                    onChange={value => updateExpense('variableExpenses', row.id, { value })} />
                  <RemoveRow label={`Remover despesa variável ${index + 1}`} onClick={() => update('variableExpenses', values.variableExpenses.filter(item => item.id !== row.id))} />
                </div>
              ))}
              <button className="advanced-add" type="button" onClick={() => update('variableExpenses', [...values.variableExpenses, newExpense()])}><Icon name="plus" /> Adicionar taxa ou comissão</button>
              {baseField('profit', 'Lucro desejado sobre a venda', { unit: '%', hint: 'Parcela do preço que sobra para o negócio após os custos e a remuneração do seu trabalho.' })}
              <div className={`markup-total${Number.isFinite(validation.totalPercentage) && validation.totalPercentage >= 100 ? ' has-error' : ''}`}>
                <span>Gastos fixos % + despesas variáveis % + lucro %</span><strong>{numeric(validation.totalPercentage)}%</strong>
              </div>
              <p className="markup-hint">A soma precisa ficar abaixo de 100% para calcular o markup.</p>
            </fieldset>
            {((attemptedSteps.includes(step) && currentErrors.length > 0) || (submitted && validation.errors.calculation))
              && <p className="markup-error" role="alert">{validation.errors.calculation || 'Revise os campos indicados nesta etapa antes de continuar.'}</p>}
            <CalculatorStepActions current={step} count={steps.length} onBack={() => showStep(step - 1)} onClear={clear} />
          </form>
        </section>

        <aside className="markup-result-panel" aria-labelledby="advanced-result-title">
          <div className="markup-result-card">
            <div className="markup-result-heading"><span className="markup-step">SEU RESULTADO</span>{isExample && <span className="markup-example-badge">Exemplo preenchido</span>}</div>
            <h2 id="advanced-result-title" ref={resultRef} tabIndex={-1}>Preço de venda por unidade</h2>
            <div className="markup-price-area" role="status" aria-live="polite" aria-atomic="true">
              <strong className="markup-price">{result ? money(result.price) : 'R$ —'}</strong>
              <p>{result ? `${result.productName} · ${numeric(result.producedQuantity)} ${result.producedQuantity === 1 ? 'unidade produzida' : 'unidades produzidas'} por receita.`
                : hasCalculated ? 'Revise os campos indicados para atualizar o preço sugerido.' : 'Preencha os dados do produto e calcule para ver o preço sugerido.'}</p>
              <p>Após o primeiro cálculo, o resultado é atualizado automaticamente ao editar os valores.</p>
            </div>
            <div className="markup-multiplier"><span>Multiplicador markup</span><strong>{result ? `${numeric(result.multiplier)}×` : '—'}</strong></div>
            <div className="markup-multiplier advanced-batch-price"><span>Venda de toda a receita</span><strong>{result ? money(result.batchPrice) : 'R$ —'}</strong></div>
          </div>
          <section className="markup-breakdown" aria-labelledby="advanced-breakdown-title">
            <h3 id="advanced-breakdown-title">Para onde vai cada parte do preço?</h3>
            <p className="markup-hint">Distribuição do valor de uma unidade vendida.</p>
            {result ? <>
              <div className="markup-bar" aria-hidden="true">{breakdown.map(item => <span key={item.className} className={item.className} style={{ width: `${item.amount / result.price * 100}%` }} />)}</div>
              <dl>{breakdown.map(item => <div key={item.className}><dt><span className={`markup-dot ${item.className}`} />{item.label}</dt><dd>{money(item.amount)}</dd></div>)}</dl>
              <div className="markup-breakdown-total"><span>Preço por unidade</span><strong>{money(result.price)}</strong></div>
            </> : <p className="markup-empty">O resultado separa materiais, trabalho, despesas e lucro.</p>}
          </section>
          <section className="markup-breakdown" aria-labelledby="advanced-summary-title">
            <h3 id="advanced-summary-title">Resumo da produção</h3>
            <dl className="advanced-summary">
              {[
                ['Custo dos insumos da receita', result ? money(result.recipeCost) : 'R$ —'],
                ['Material por unidade', result ? money(result.materialCost) : 'R$ —'],
                ['Horas produtivas no mês', result ? `${numeric(result.monthlyProductiveHours)} h` : '—'],
                ['Valor da sua hora', result ? money(result.hourlyRate) : 'R$ —'],
                ['Tempo de trabalho por unidade', result ? `${numeric(result.timePerUnit)} h` : '—'],
                ['Mão de obra por unidade', result ? money(result.laborCost) : 'R$ —'],
                ['Depreciação por mês', result ? money(result.monthlyDepreciation) : 'R$ —'],
                ['Gastos fixos com depreciação', result ? money(result.monthlyFixedExpenses) : 'R$ —'],
                ['Percentual de gastos fixos', result ? `${numeric(result.fixedPercentage)}%` : '—'],
                ['Custo-base por unidade', result ? money(result.directCost) : 'R$ —'],
              ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>
          <p className="markup-local-note"><Icon name="shieldCheck" /><span>Os cálculos são feitos neste navegador. Seus dados não são enviados ao portal.</span></p>
          {isExample && <p className="markup-hint advanced-example-note">Exemplo ilustrativo: gás a R$ 125,00 por botijão, duração de 320 horas e uso de 4 horas por receita. Ajuste esses dados à sua realidade.</p>}
        </aside>
      </div>

      <section className="markup-guide" aria-labelledby="advanced-guide-title">
        <h2 id="advanced-guide-title"><Icon name="information" /> Como chegamos a esse preço</h2>
        <p className="markup-formula">Preço por unidade = (material por unidade + mão de obra por unidade) × 100 ÷ [100 − (gastos fixos % + despesas variáveis % + lucro %)]</p>
        <ol className="advanced-formula-steps">
          <li><strong>Rendimento do insumo</strong><span>Quantidade comprada ÷ quantidade usada, após converter as medidas.</span></li>
          <li><strong>Custo do insumo na receita</strong><span>Valor total pago ÷ rendimento.</span></li>
          <li><strong>Custo total da receita</strong><span>Soma dos custos de todos os insumos e embalagens.</span></li>
          <li><strong>Material por unidade</strong><span>Custo total da receita ÷ quantidade produzida.</span></li>
          <li><strong>Horas produtivas mensais</strong><span>Horas produtivas por dia × dias trabalhados.</span></li>
          <li><strong>Valor da hora trabalhada</strong><span>Remuneração mensal ÷ horas produtivas mensais.</span></li>
          <li><strong>Tempo por unidade</strong><span>Tempo de trabalho na receita, em horas, ÷ quantidade produzida.</span></li>
          <li><strong>Mão de obra por unidade</strong><span>Valor da hora × tempo por unidade.</span></li>
          <li><strong>Gastos fixos mensais</strong><span>Soma das contas fixas + depreciação. Cada depreciação = valor atual ÷ meses restantes de uso.</span></li>
          <li><strong>Percentual de gastos fixos</strong><span>Gastos fixos mensais ÷ faturamento médio mensal × 100.</span></li>
          <li><strong>Custo-base por unidade</strong><span>Material por unidade + mão de obra por unidade.</span></li>
          <li><strong>Markup</strong><span>100 ÷ [100 − (gastos fixos % + despesas variáveis % + lucro %)].</span></li>
          <li><strong>Preço de venda sugerido</strong><span>Custo-base por unidade × markup.</span></li>
        </ol>
      </section>
      <p className="markup-disclaimer">Simulação por unidade. Os cálculos mantêm a precisão até a exibição dos valores; ajuste custos, rendimentos e percentuais à realidade do seu negócio.</p>
    </div>
  )
}
