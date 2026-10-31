import type { CalculatorHelp } from './CalculatorFieldHelp'
import type { PurchaseUnit } from '../../utils/advancedPricingCalculator'

const help = {
  producedQuantity: {
    explanation: 'Um lote é o conjunto de unidades produzidas em uma mesma produção. Informe quantas ficam prontas para vender, já descontando perdas. Use a mesma unidade de venda em toda a simulação.',
    example: 'Se um lote custa R$ 20 em materiais e rende 10 unidades, o material custa R$ 2 por unidade. Se vender por kg, informe quantos kg o lote rende.',
    effect: 'O custo dos materiais e o tempo de trabalho do lote são divididos por essa quantidade. Com os mesmos custos e tempo, mais unidades reduzem o custo por unidade.',
  },
  productionTime: {
    explanation: 'Informe o tempo de trabalho dedicado a produzir todo o lote, e não apenas uma unidade. Escolha horas ou minutos no campo seguinte.',
    example: 'Se você trabalha 2 horas para produzir 10 unidades, cada unidade usa 0,2 hora. Com a hora a R$ 20, a mão de obra é R$ 4 por unidade.',
    effect: 'Esse tempo é dividido pela quantidade produzida e multiplicado pelo valor da sua hora. Mais tempo de trabalho aumenta o custo de mão de obra por unidade.',
  },
  purchasedQuantity: {
    explanation: 'Informe toda a quantidade comprada à qual o valor pago se refere. Escolha a medida correspondente, como kg, g, litros, metros, centímetros ou unidades.',
    example: 'Se comprou 1 kg de material por R$ 4,80 e usa 500 g por lote, preencha quantidade 1, medida kg e valor R$ 4,80. Essa compra rende 2 lotes.',
    effect: 'A quantidade comprada é comparada com a quantidade usada. Mantendo o valor total pago, uma compra com mais conteúdo reduz o custo da parte usada.',
  },
  purchasedUnit: {
    explanation: 'Escolha a medida da compra. Use Pacote para informar o valor e a quantidade de itens que vêm no pacote. Use Consumo para informar o valor pago e quanto tempo dura.',
    example: 'Um material pode ser comprado em metros e usado em centímetros. Um pacote pode conter 100 itens. Um recurso pode ser cadastrado como Consumo com duração de 320 horas.',
    effect: 'A calculadora converte kg para g, litros para mL, metros para centímetros e horas para minutos. A medida usada na produção mostra somente opções compatíveis.',
  },
  purchaseValue: {
    explanation: 'Informe o valor total pago por toda a quantidade comprada deste insumo. Não informe o preço por unidade se a quantidade representa várias unidades.',
    example: 'Se comprou 2 kg de material por R$ 10 cada, informe quantidade 2 e valor total R$ 20. Se comprou 100 embalagens por R$ 5, informe R$ 5.',
    effect: 'O valor pago é dividido pelo rendimento da compra para encontrar o custo deste insumo no lote. Um valor maior aumenta o custo do lote.',
  },
  usedQuantity: {
    explanation: 'Informe quanto deste insumo é usado na produção de um lote completo. Não repita aqui a quantidade produzida nem o conteúdo total da compra.',
    example: 'De uma compra de 1.000 g de material que custou R$ 4,80, você usa 500 g no lote. O custo desse material no lote é R$ 2,40.',
    effect: 'Usar mais quantidade do mesmo insumo aumenta o custo do lote. A calculadora considera apenas a parte usada, sem cobrar toda a compra quando sobra material.',
  },
  usedUnit: {
    explanation: 'Escolha a medida da quantidade usada na produção entre as opções compatíveis com a compra. Pacotes usam unidades; consumo usa horas ou minutos.',
    example: 'É possível comprar 1 kg e usar 500 g, ou comprar 2 m de material e usar 50 cm. Para um pacote de itens, informe quantas unidades usou.',
    effect: '500 g e 0,5 kg produzem o mesmo custo. Uma medida incorreta pode representar uma quantidade diferente, por isso a calculadora bloqueia medidas incompatíveis.',
  },
  consumptionUnit: {
    explanation: 'Escolha horas ou minutos para a duração total do consumo. Informe o tempo que o recurso dura nas mesmas condições de uso da produção.',
    example: 'Se um recurso dura 320 horas, informe duração 320 e medida horas. O tempo usado na produção pode ser informado em horas ou minutos.',
    effect: 'A calculadora converte os tempos para a mesma medida antes de calcular a fração consumida. Ao trocar a medida, ajuste o número para representar a duração desejada.',
  },
  monthlyPay: {
    explanation: 'Informe quanto você quer receber por mês pelo trabalho de produção. Essa remuneração paga seu trabalho e é separada do lucro do negócio.',
    example: 'Com remuneração de R$ 1.600 e 160 horas produtivas no mês, sua hora vale R$ 10.',
    effect: 'A remuneração é dividida pelas horas produtivas mensais. Aumentar esse valor aumenta a mão de obra incluída no preço, mantendo o tempo trabalhado.',
  },
  hoursPerDay: {
    explanation: 'Informe quantas horas por dia são dedicadas à produção. Considere o tempo produtivo e informe um valor maior que zero, de até 24 horas.',
    example: '8 horas produtivas por dia × 20 dias trabalhados = 160 horas produtivas no mês.',
    effect: 'Essas horas ajudam a calcular o valor da sua hora. Com a mesma remuneração mensal, mais horas produtivas distribuem esse valor por um período maior.',
  },
  daysPerMonth: {
    explanation: 'Informe em quantos dias do mês você trabalha na produção. Considere sua rotina real, incluindo folgas, e use um valor maior que zero e de até 31 dias.',
    example: 'Trabalhando 20 dias no mês por 8 horas produtivas diárias, o total mensal é de 160 horas.',
    effect: 'Dias trabalhados × horas produtivas por dia formam o total mensal. Esse total é usado para dividir a remuneração e calcular o valor da hora.',
  },
  fixedExpense: {
    explanation: 'Informe o valor mensal de uma conta do negócio, como aluguel ou internet. Se a conta também é da sua casa, inclua somente a parte usada no negócio.',
    example: 'Se a internet custa R$ 100 e metade é usada no negócio, inclua R$ 50. Some outras contas em linhas separadas.',
    effect: 'Essas contas são somadas à depreciação e divididas pelo faturamento para calcular o percentual de gastos fixos. Não repita materiais, consumo ou trabalho já contabilizados.',
  },
  equipmentValue: {
    explanation: 'Informe quanto o equipamento vale hoje. Esse valor será dividido pelos meses que ele ainda deve durar para estimar a depreciação mensal.',
    example: 'Um equipamento avaliado em R$ 1.200 que ainda deve durar 60 meses representa R$ 20 de depreciação por mês.',
    effect: 'A depreciação entra nos gastos fixos mensais. Um valor maior do equipamento aumenta essa reserva mensal, mantendo o tempo restante de uso.',
  },
  lifeMonths: {
    explanation: 'Estime por quantos meses o equipamento ainda poderá ser usado no negócio. Informe meses restantes, não anos nem o tempo que já passou.',
    example: 'Se o equipamento deve durar mais 5 anos, informe 60 meses. Com valor atual de R$ 1.200, a depreciação será de R$ 20 por mês.',
    effect: 'Valor atual ÷ meses restantes = depreciação mensal. Menos meses aumentam o valor mensal reservado para o desgaste. O número precisa ser maior que zero.',
  },
  monthlyRevenue: {
    explanation: 'Informe a média mensal de todas as vendas, antes de pagar as contas. Esse valor é o faturamento, e não o lucro ou o dinheiro que sobra.',
    example: 'R$ 1.000 de gastos fixos ÷ R$ 10.000 de faturamento × 100 = 10%. Com os mesmos gastos e R$ 20.000 de faturamento, o percentual cai para 5%.',
    effect: 'O faturamento distribui os gastos fixos entre as vendas e altera o markup. Sem gastos fixos nem depreciação, mudar esse valor não altera o preço. Use uma média realista e maior que zero.',
  },
  variableExpense: {
    explanation: 'Informe a porcentagem da venda destinada a uma taxa ou comissão. Cadastre cada taxa em uma linha para que os percentuais sejam somados.',
    example: 'Uma taxa da maquininha de 3% e uma comissão de 2% somam 5%. Em uma venda de R$ 20, essas despesas representam R$ 1.',
    effect: 'As taxas entram no markup como parcelas do preço de venda. Quanto maiores essas porcentagens, maior o preço necessário para cobri-las. Não repita os materiais neste campo.',
  },
  profit: {
    explanation: 'Escolha qual porcentagem do preço de venda deve sobrar como lucro depois de pagar materiais, trabalho e despesas. Você pode usar o slider ou escrever o percentual.',
    example: 'Com lucro de 20%, uma venda de R$ 10 reserva R$ 2 como lucro. Essa margem é uma parte do preço de venda, não um acréscimo de 20% sobre o custo.',
    effect: 'Um lucro desejado maior aumenta o preço sugerido. A soma dos percentuais de gastos fixos, taxas e lucro deve ficar abaixo de 100%.',
  },
} satisfies Record<string, CalculatorHelp>

const packageHelp: Partial<Record<keyof typeof help, CalculatorHelp>> = {
  purchasedQuantity: {
    explanation: 'Informe quantos itens vêm no pacote cujo valor foi informado.',
    example: 'Se o pacote contém 100 embalagens e custa R$ 20, informe 100. Cada embalagem custa R$ 0,20.',
    effect: 'O valor do pacote é dividido pela quantidade de itens para calcular o custo de cada unidade.',
  },
  purchaseValue: {
    explanation: 'Informe quanto custou o pacote completo.',
    example: 'Um pacote com 100 embalagens custou R$ 20. Informe R$ 20, mesmo que use somente 5 embalagens na produção.',
    effect: 'A calculadora cobra na produção apenas a parte do pacote que foi usada.',
  },
  usedQuantity: {
    explanation: 'Informe quantos itens do pacote foram usados em toda a produção.',
    example: 'De um pacote com 100 embalagens que custou R$ 20, você usa 5. O custo na produção é R$ 1.',
    effect: 'Custo na produção = valor do pacote ÷ quantidade de itens no pacote × quantidade usada.',
  },
}

const consumptionHelp: Partial<Record<keyof typeof help, CalculatorHelp>> = {
  purchasedQuantity: {
    explanation: 'Informe quanto tempo dura o recurso pelo qual você pagou. Estime a duração nas mesmas condições de uso da produção.',
    example: 'Se um recurso custa R$ 125 e dura 320 horas, informe duração total 320 e medida horas.',
    effect: 'O valor pago é dividido pela duração para calcular o custo por hora ou minuto de uso.',
  },
  purchaseValue: {
    explanation: 'Informe o valor pago pelo recurso correspondente à duração total informada.',
    example: 'Se o recurso custou R$ 125 e dura 320 horas, informe R$ 125.',
    effect: 'A calculadora distribui esse valor pela duração e considera apenas o tempo usado na produção.',
  },
  usedQuantity: {
    explanation: 'Informe o tempo de consumo durante toda a produção, em horas ou minutos.',
    example: 'Um recurso de R$ 125 que dura 320 horas, usado por 4 horas, representa aproximadamente R$ 1,56 na produção.',
    effect: 'Custo na produção = valor pago ÷ duração total × tempo usado, após converter horas e minutos.',
  },
}

export function getAdvancedFieldHelp(name: string, purchaseUnit?: PurchaseUnit): CalculatorHelp | undefined {
  const field = name.split('.').at(-1)!
  const categoryHelp = purchaseUnit === 'package' ? packageHelp : purchaseUnit === 'consumption' ? consumptionHelp : undefined
  if (categoryHelp && Object.hasOwn(categoryHelp, field)) return categoryHelp[field as keyof typeof help]
  if (name.startsWith('fixedExpenses.') && field === 'value') return help.fixedExpense
  if (name.startsWith('variableExpenses.') && field === 'value') return help.variableExpense
  if (name.startsWith('equipment.') && field === 'value') return help.equipmentValue
  return Object.hasOwn(help, field) ? help[field as keyof typeof help] : undefined
}
