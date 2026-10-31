import type { CalculatorHelp } from './CalculatorFieldHelp'

const help = {
  producedQuantity: {
    explanation: 'Informe quantas unidades prontas para vender saem de uma receita ou lote, já descontando perdas. Use a mesma unidade de venda em toda a simulação.',
    example: 'Se uma receita custa R$ 20 em materiais e rende 10 potes, o material custa R$ 2 por pote. Se vender por kg, informe quantos kg o lote rende.',
    effect: 'O custo dos materiais e o tempo de trabalho da receita são divididos por essa quantidade. Com os mesmos custos e tempo, mais unidades reduzem o custo por unidade.',
  },
  productionTime: {
    explanation: 'Informe o tempo de trabalho dedicado a preparar toda a receita, e não apenas uma unidade. Escolha horas ou minutos no campo seguinte.',
    example: 'Se você trabalha 2 horas para preparar 10 potes, cada pote usa 0,2 hora. Com a hora a R$ 20, a mão de obra é R$ 4 por pote.',
    effect: 'Esse tempo é dividido pela quantidade produzida e multiplicado pelo valor da sua hora. Mais tempo de trabalho aumenta o custo de mão de obra por unidade.',
  },
  purchasedQuantity: {
    explanation: 'Informe toda a quantidade comprada à qual o valor pago se refere. Escolha a medida correspondente: kg, g, litros, unidades ou pacote/botijão.',
    example: 'Se comprou 1 kg de farinha por R$ 4,80 e usa 500 g, preencha quantidade 1, medida kg e valor R$ 4,80. Essa compra rende 2 receitas.',
    effect: 'A quantidade comprada é comparada com a quantidade usada. Mantendo o valor total pago, uma compra com mais conteúdo reduz o custo da porção usada.',
  },
  purchasedUnit: {
    explanation: 'Escolha a medida da compra. Para algo vendido em pacote ou botijão, escolha essa opção e informe também o conteúdo ou a duração de cada embalagem.',
    example: 'Um pacote de farinha de 1 kg pode ser informado como 1 kg. Um botijão pode ser informado como 1 pacote/botijão com duração estimada em horas.',
    effect: 'A calculadora converte kg para g, litros para mL e horas para minutos. Medidas de tipos diferentes, como kg e litros, não podem ser comparadas diretamente.',
  },
  purchaseValue: {
    explanation: 'Informe o valor total pago por toda a quantidade comprada deste insumo. Não informe o preço por unidade se a quantidade representa várias unidades.',
    example: 'Se comprou 2 pacotes por R$ 10 cada, informe quantidade 2 e valor total R$ 20. Se comprou 100 embalagens por R$ 5, informe R$ 5.',
    effect: 'O valor pago é dividido pelo rendimento da compra para encontrar o custo deste insumo na receita. Um valor maior aumenta o custo da receita.',
  },
  usedQuantity: {
    explanation: 'Informe quanto deste insumo entra em uma receita completa. Não repita aqui a quantidade produzida nem o conteúdo total da compra.',
    example: 'De um pacote com 1.000 g de farinha que custou R$ 4,80, você usa 500 g na receita. O custo dessa farinha na receita é R$ 2,40.',
    effect: 'Usar mais quantidade do mesmo insumo aumenta o custo da receita. A calculadora considera apenas a parte usada, sem cobrar o pacote inteiro quando sobra conteúdo.',
  },
  usedUnit: {
    explanation: 'Escolha a medida da quantidade usada na receita. Ela precisa ser compatível com a medida da compra ou do conteúdo do pacote.',
    example: 'É possível comprar 1 kg e usar 500 g: a calculadora converte as medidas. Para uma embalagem, use unidades; para consumo de gás por duração, use horas ou minutos.',
    effect: '500 g e 0,5 kg produzem o mesmo custo. Uma medida incorreta pode representar uma quantidade diferente, por isso a calculadora bloqueia medidas incompatíveis.',
  },
  packageQuantity: {
    explanation: 'Informe quanto vem ou quanto dura cada pacote ou botijão. Para gás, use uma duração estimada nas mesmas condições de consumo da receita.',
    example: 'Se um botijão custa R$ 125 e dura 320 horas, uma receita que usa 4 horas consome R$ 125 ÷ 320 × 4 = aproximadamente R$ 1,56 de gás.',
    effect: 'Esse conteúdo é multiplicado pelo número de pacotes comprados. Quanto maior o conteúdo ou duração, menor o custo da parte usada, mantendo o valor pago.',
  },
  packageUnit: {
    explanation: 'Escolha em que medida foi informado o conteúdo ou a duração de cada pacote. A quantidade usada na receita será comparada com esse conteúdo.',
    example: 'Um pacote com 100 sacos usa a medida unidades. Um botijão com duração estimada de 320 horas usa a medida horas.',
    effect: 'A medida permite calcular o rendimento de cada pacote corretamente. Ela deve ser compatível com a medida da quantidade usada na receita.',
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
    effect: 'Essas contas são somadas à depreciação e divididas pelo faturamento para calcular o percentual de gastos fixos. Não repita materiais, gás ou trabalho já contabilizados.',
  },
  equipmentValue: {
    explanation: 'Informe quanto o equipamento vale hoje. Esse valor será dividido pelos meses que ele ainda deve durar para estimar a depreciação mensal.',
    example: 'Um forno avaliado em R$ 1.200 que ainda deve durar 60 meses representa R$ 20 de depreciação por mês.',
    effect: 'A depreciação entra nos gastos fixos mensais. Um valor maior do equipamento aumenta essa reserva mensal, mantendo o tempo restante de uso.',
  },
  lifeMonths: {
    explanation: 'Estime por quantos meses o equipamento ainda poderá ser usado no negócio. Informe meses restantes, não anos nem o tempo que já passou.',
    example: 'Se o forno deve durar mais 5 anos, informe 60 meses. Com valor atual de R$ 1.200, a depreciação será de R$ 20 por mês.',
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

export function getAdvancedFieldHelp(name: string): CalculatorHelp | undefined {
  const field = name.split('.').at(-1)!
  if (name.startsWith('fixedExpenses.') && field === 'value') return help.fixedExpense
  if (name.startsWith('variableExpenses.') && field === 'value') return help.variableExpense
  if (name.startsWith('equipment.') && field === 'value') return help.equipmentValue
  return Object.hasOwn(help, field) ? help[field as keyof typeof help] : undefined
}
