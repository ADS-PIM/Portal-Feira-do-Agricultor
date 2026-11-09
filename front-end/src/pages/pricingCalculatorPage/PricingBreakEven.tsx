import type { MarkupResult } from '../../utils/pricingCalculator'
import './PricingBreakEven.css'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const preciseDecimal = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 17 })
const numeric = (value: number) => {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(4))
  return ((value > 0 && rounded === 0) || (value < 100 && rounded === 100) ? preciseDecimal : decimal).format(value)
}

type Props = {
  result: MarkupResult | null
  titleId: string
  fixedExpensesLabel?: string
}

export default function PricingBreakEven({ result, titleId, fixedExpensesLabel = 'Gastos fixos por mês' }: Props) {
  const minimumQuantity = result?.breakEvenQuantity != null ? Math.ceil(result.breakEvenQuantity) : null

  return (
    <section className="markup-break-even" aria-labelledby={titleId}>
      <h3 id={titleId}>Ponto de equilíbrio mensal</h3>
      <p>Quanto vender para cobrir os custos, sem lucro nem prejuízo.</p>
      <dl className="markup-break-even-values" role="status" aria-live="polite" aria-atomic="true">
        <div><dt>Faturamento necessário</dt><dd>{result?.breakEvenRevenue != null ? currency.format(result.breakEvenRevenue) : 'R$ —'}</dd></div>
        <div><dt>Quantidade mínima</dt><dd>{minimumQuantity !== null
          ? `${numeric(minimumQuantity)} ${minimumQuantity === 1 ? 'unidade' : 'unidades'}` : '—'}</dd></div>
      </dl>
      {result && result.monthlyFixedExpenses === 0 && <p>Sem gastos fixos cadastrados, o mínimo para cobri-los é zero.</p>}
      {result && (result.breakEvenRevenue === null || result.breakEvenQuantity === null)
        && <p>Não foi possível calcular o ponto de equilíbrio com estes valores. Revise os custos e a margem de contribuição.</p>}
      <details className="markup-break-even-help">
        <summary>Como é calculado?</summary>
        <p>A margem de contribuição é o preço de venda menos materiais, mão de obra por unidade e taxas de venda. Ela cobre os gastos fixos e, depois, gera lucro.</p>
        <dl>
          <div><dt>{fixedExpensesLabel}</dt><dd>{result ? currency.format(result.monthlyFixedExpenses) : 'R$ —'}</dd></div>
          <div><dt>Margem de contribuição por unidade</dt><dd>{result ? `${currency.format(result.contributionMarginPerUnit)} (${numeric(result.contributionMarginPercentage)}%)` : 'R$ —'}</dd></div>
          <div><dt>Margem de contribuição mensal estimada</dt><dd>{result ? currency.format(result.monthlyContributionMargin) : 'R$ —'}</dd></div>
        </dl>
        <p>PE em valor = (gastos fixos ÷ margem de contribuição mensal) × faturamento mensal.</p>
        <p>PE em quantidade = gastos fixos mensais ÷ margem de contribuição por unidade.</p>
        <p>A margem mensal considera o faturamento informado e a proporção de custos deste produto. A mão de obra acompanha a quantidade produzida, como no cálculo do preço.</p>
      </details>
    </section>
  )
}
