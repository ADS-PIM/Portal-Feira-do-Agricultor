import type { CalculatorHelp } from './CalculatorFieldHelp'
import type { PurchaseUnit } from '../../utils/advancedPricingCalculator'

const help = {
  producedQuantity: {
    lead: 'Conte o que o lote rende para venda.',
    explanation: 'Um lote é tudo o que você faz de uma vez. Use a mesma unidade em que vende, como potes, peças ou quilos, e desconte as perdas.',
    example: 'Você preparou 12 potes, mas só 10 ficaram prontos para vender. Preencha 10.',
    effect: 'Se gastou R$ 30 em materiais, cada um dos 10 potes precisa cobrir R$ 3. A calculadora também divide o trabalho entre eles.',
  },
  productionTime: {
    lead: 'Conte o tempo de trabalho do lote inteiro.',
    explanation: 'Some o tempo que você dedica às etapas dessa produção. Escolha horas ou minutos no campo ao lado.',
    example: 'Você leva 30 minutos para preparar a geleia e 15 para encher os potes. Preencha 45 e escolha Minutos.',
    effect: 'Se sua hora vale R$ 20, esses 45 minutos custam R$ 15 de trabalho. Um lote de 10 potes leva R$ 1,50 de trabalho por pote.',
  },
  purchasedQuantity: {
    lead: 'Informe quanto veio na compra inteira.',
    explanation: 'Use a quantidade que corresponde ao valor total pago. Mais adiante você informa quanto usou no lote.',
    example: 'Você comprou 2 kg de açúcar por R$ 8. Preencha 2 na quantidade comprada e escolha kg como medida.',
    effect: 'Essa compra custa R$ 4 por kg. Se o lote usar meio quilo, entram R$ 2 no custo do lote.',
  },
  purchasedUnit: {
    lead: 'Escolha como você comprou o material.',
    explanation: 'Use kg, litros ou metros para compras por peso, volume ou comprimento. Escolha Pacote para contar itens ou Consumo para repartir um gasto pelo tempo de uso.',
    example: 'Para açúcar vendido por quilo, escolha kg. Para uma caixa de 100 potes vendidos juntos, escolha Pacote.',
    effect: 'A escolha define como informar a parte usada. Uma compra em kg permite lançar o uso em gramas. Um pacote permite contar os itens usados.',
  },
  purchaseValue: {
    lead: 'Informe o preço da compra inteira.',
    explanation: 'Use o valor que pagou por toda a quantidade informada no campo de compra.',
    example: 'Você comprou 2 kg de açúcar a R$ 4 por kg. No valor da compra, preencha R$ 8.',
    effect: 'Se usar um quarto dessa compra, o lote recebe um quarto do valor pago, ou seja, R$ 2.',
  },
  usedQuantity: {
    lead: 'Conte quanto desse material entra em um lote.',
    explanation: 'Use a quantidade da receita completa. A calculadora divide o custo pelas unidades que você vai vender.',
    example: 'Você comprou 2 kg de açúcar por R$ 8 e usou 500 g na receita. Preencha 500 e escolha g.',
    effect: 'Os 500 g custam R$ 2. Se a receita rende 10 potes, cada pote leva R$ 0,20 de açúcar.',
  },
  usedUnit: {
    lead: 'Escolha a medida que acompanha o número usado no lote.',
    explanation: 'Você pode usar uma medida diferente da compra quando elas medem a mesma coisa, como kg e g ou metros e centímetros.',
    example: 'Se pesou 500 g de açúcar, preencha 500 e escolha g. Também pode preencher 0,5 e escolher kg.',
    effect: 'As duas formas representam a mesma quantidade e geram o mesmo custo. Em pacotes, conte itens. Em consumo, informe tempo.',
  },
  consumptionUnit: {
    lead: 'Escolha horas ou minutos para a duração total.',
    explanation: 'Use a medida da sua estimativa de quanto tempo o recurso dura até acabar.',
    example: 'Se um botijão dura 40 horas de uso, preencha 40 e escolha Horas. Na receita, você pode registrar o uso em minutos.',
    effect: 'A calculadora coloca os dois tempos na mesma medida. Assim, 30 minutos de uso correspondem a meia hora do total.',
  },
  monthlyPay: {
    lead: 'Informe quanto quer receber por mês pelo seu trabalho.',
    explanation: 'Esse valor remunera as horas de produção. Você escolhe o lucro do negócio em outro campo.',
    example: 'Se quer receber R$ 1.600 e trabalha 160 horas por mês, cada hora de produção vale R$ 10.',
    effect: 'Um lote que exige 2 horas inclui R$ 20 pelo seu trabalho. Esse valor é repartido entre as unidades do lote.',
  },
  hoursPerDay: {
    lead: 'Conte as horas que dedica à produção em um dia de trabalho.',
    explanation: 'Se sua rotina varia, use uma média dos dias em que produz. Informe mais de zero e até 24 horas.',
    example: 'Se costuma produzir das 8h às 12h e das 14h às 16h, preencha 6. Em 20 dias, isso dá 120 horas.',
    effect: 'A calculadora divide a remuneração mensal por essas horas. Contar horas de folga reduziria o valor calculado para sua hora de produção.',
  },
  daysPerMonth: {
    lead: 'Conte os dias em que realmente produz no mês.',
    explanation: 'Desconte as folgas e use um número maior que zero e de até 31 dias.',
    example: 'Se produz 5 dias por semana e está considerando 4 semanas, preencha 20.',
    effect: 'Com 6 horas por dia e 20 dias de trabalho, a remuneração mensal é dividida por 120 horas para obter o valor da sua hora.',
  },
  fixedExpense: {
    lead: 'Informe a parte mensal dessa conta que cabe ao negócio.',
    explanation: 'Registre cada conta fixa em uma linha. Para uma conta compartilhada com a casa, estime a parte usada na produção.',
    example: 'Se a internet custa R$ 100 e metade é usada pelo negócio, preencha R$ 50 nessa linha.',
    effect: 'A calculadora soma essas contas ao desgaste mensal dos equipamentos e usa o faturamento para distribuir o total entre as vendas.',
  },
  equipmentValue: {
    lead: 'Estime quanto o equipamento vale hoje.',
    explanation: 'Considere o estado atual do equipamento e por quanto tempo ele ainda poderá ser usado.',
    example: 'Uma seladora vale R$ 1.200 hoje e deve durar mais 60 meses. O desgaste estimado é de R$ 20 por mês.',
    effect: 'Esses R$ 20 entram nas despesas fixas mensais. Cada venda cobre uma parte do desgaste da seladora.',
  },
  lifeMonths: {
    lead: 'Informe quantos meses de uso ainda restam.',
    explanation: 'Se pensou em anos, multiplique por 12. Use uma estimativa maior que zero.',
    example: 'Se uma seladora deve durar mais 5 anos, preencha 60. Esses são os meses pelos quais o valor atual será dividido.',
    effect: 'Uma seladora de R$ 1.200 com 60 meses restantes custa R$ 20 por mês em desgaste. Com 30 meses restantes, o valor sobe para R$ 40.',
  },
  monthlyRevenue: {
    lead: 'Informe quanto o negócio costuma vender por mês.',
    explanation: 'Some as vendas de todos os produtos antes de descontar as despesas. Use uma média mensal maior que zero.',
    example: 'Se vendeu R$ 8.000 em um mês e R$ 12.000 no outro, a média é R$ 10.000.',
    effect: 'Com essa média e R$ 1.000 de gastos fixos mensais, o preço reserva 10% de cada venda para pagar esses gastos.',
  },
  variableExpense: {
    lead: 'Cadastre uma taxa por vez.',
    explanation: 'Dê um nome à taxa e informe o percentual que ela cobra sobre a venda. A calculadora soma os percentuais dos quadros.',
    example: 'Cadastre a maquininha com 3% e a comissão com 2% em outro quadro. Juntas, elas consomem 5% da venda.',
    effect: 'Em uma venda de R$ 20, R$ 1 cobre essas duas taxas. O preço sugerido já inclui esse valor.',
  },
  profit: {
    lead: 'Escolha a parte do preço final que deseja guardar como lucro.',
    explanation: 'Use o controle ou digite o percentual. O cálculo já considera o pagamento pelo seu trabalho antes de reservar o lucro.',
    example: 'Para guardar R$ 2 a cada R$ 10 vendidos, escolha 20%.',
    effect: 'Um lucro desejado maior aumenta o preço sugerido. A soma dos percentuais de gastos fixos, taxas e lucro precisa ficar abaixo de 100%.',
  },
} satisfies Record<string, CalculatorHelp>

const packageHelp: Partial<Record<keyof typeof help, CalculatorHelp>> = {
  purchasedQuantity: {
    lead: 'Conte todos os itens que vêm no pacote.',
    explanation: 'Use o número de itens correspondente ao preço que você informou.',
    example: 'Se pagou R$ 20 por um pacote de 100 embalagens, preencha 100.',
    effect: 'Cada embalagem custa R$ 0,20. O lote recebe o custo de quantas embalagens usar.',
  },
  purchaseValue: {
    lead: 'Preencha o valor pago pelo pacote inteiro.',
    explanation: 'A quantidade de itens usados será informada em outro campo.',
    example: 'Se 100 embalagens custaram R$ 20 juntas, preencha R$ 20.',
    effect: 'A calculadora divide R$ 20 por 100 antes de calcular o gasto do lote. Cada embalagem usada acrescenta R$ 0,20.',
  },
  usedQuantity: {
    lead: 'Conte os itens do pacote usados neste lote.',
    explanation: 'Some todos os itens usados para preparar ou embalar a produção inteira.',
    example: 'Se usou 5 embalagens de um pacote com 100, preencha 5.',
    effect: 'Em um pacote de R$ 20 com 100 embalagens, as 5 usadas custam R$ 1 ao lote.',
  },
}

const consumptionHelp: Partial<Record<keyof typeof help, CalculatorHelp>> = {
  purchasedQuantity: {
    lead: 'Estime quanto tempo o recurso dura até acabar.',
    explanation: 'Considere as condições habituais de uso na sua produção e escolha horas ou minutos.',
    example: 'Um botijão de R$ 120 dura cerca de 40 horas de fogão ligado. Preencha 40 e escolha Horas.',
    effect: 'Nesse exemplo, cada hora de uso custa R$ 3. O lote recebe apenas o custo do tempo que usou.',
  },
  purchaseValue: {
    lead: 'Informe quanto pagou pelo recurso inteiro.',
    explanation: 'O valor deve corresponder à duração total que você estimou.',
    example: 'Se pagou R$ 120 por um botijão que dura 40 horas, preencha R$ 120.',
    effect: 'A calculadora distribui os R$ 120 pelas 40 horas. Um lote que usa o fogão por meia hora recebe R$ 1,50 de gás.',
  },
  usedQuantity: {
    lead: 'Conte o tempo em que o recurso foi usado neste lote.',
    explanation: 'Informe a duração do uso e escolha horas ou minutos.',
    example: 'Se o fogão ficou ligado por meia hora para fazer a receita, preencha 30 e escolha Minutos.',
    effect: 'Se o gás custa R$ 3 por hora de uso, os 30 minutos acrescentam R$ 1,50 ao custo do lote.',
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
