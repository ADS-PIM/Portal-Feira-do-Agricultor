import josefaPhoto from '../../assets/producers/josefa-alexandre-barreto.jpeg'
import neutaniaPhoto from '../../assets/producers/neutania-soares.jpeg'
import marinalvaPhoto from '../../assets/producers/marinalva.jpeg'
import nubiaPhoto from '../../assets/producers/nubia-moreira-maia.jpeg'
import ocimarPhoto from '../../assets/producers/ocimar.jpeg'
import franciscaDianaPhoto from '../../assets/producers/francisca-diana-alves-de-almeida.jpeg'

const productGroups = [
  { id: 'vegetables', label: 'Verduras e temperos', color: 'green' },
  { id: 'fruits', label: 'Frutas', color: 'green' },
  { id: 'plants', label: 'Mudas e sementes', color: 'green' },
  { id: 'pantry', label: 'Alimentos e ingredientes', color: 'orange' },
  { id: 'meals', label: 'Comidas prontas', color: 'orange' },
  { id: 'drinks', label: 'Bebidas', color: 'orange' },
  { id: 'handicrafts', label: 'Artesanato', color: 'pink' },
  { id: 'care', label: 'Cuidados pessoais', color: 'pink' },
] as const

type ProducerProductGroup = typeof productGroups[number]['id']

export type ProducerProduct = {
  name: string
  group: ProducerProductGroup
  description: string
  image: string | null
}

export type Producer = {
  slug: string
  name: string
  location: string
  community: string
  category: string
  primaryProductGroup: ProducerProductGroup
  brand?: string
  specialities: string[]
  products: ProducerProduct[]
  description: string
  story: string
  productsCount: number
  experience?: string
  highlights: string[]
  image: string | null
  imagePosition?: string
}

export const producers: Producer[] = [
  {
    slug: 'josefa-alexandre-barreto',
    name: 'Josefa Alexandre Barreto',
    location: 'Tapera',
    community: 'Tabuleiro do Norte',
    category: 'Verduras',
    primaryProductGroup: 'vegetables',
    specialities: ['Panelada / Galinha', 'Cheiro verde', 'Pimentão', 'Couve manteiga', 'Manga', 'Alface', 'Salsinha', 'Coentro'],
    products: [
      { name: 'Panelada / Galinha', group: 'meals', description: 'Pratos comercializados por Josefa na feira.', image: null },
      { name: 'Cheiro verde', group: 'vegetables', description: 'Tempero para diferentes preparos do dia a dia.', image: null },
      { name: 'Pimentão', group: 'vegetables', description: 'Para saladas, refogados e outras receitas.', image: null },
      { name: 'Couve manteiga', group: 'vegetables', description: 'Folhas para saladas, refogados e acompanhamentos.', image: null },
      { name: 'Manga', group: 'fruits', description: 'Fruta para consumir ao natural ou preparar sucos e sobremesas.', image: null },
      { name: 'Alface', group: 'vegetables', description: 'Folhas para saladas e acompanhamentos.', image: null },
      { name: 'Salsinha', group: 'vegetables', description: 'Erva para temperar e finalizar pratos.', image: null },
      { name: 'Coentro', group: 'vegetables', description: 'Tempero para diferentes receitas.', image: null },
    ],
    description: 'Da comunidade Tapera, em Tabuleiro do Norte, Josefa comercializa panelada, galinha, verduras, temperos e manga.',
    story: 'Josefa Alexandre Barreto é da comunidade Tapera, em Tabuleiro do Norte. Na feira, comercializa panelada / galinha, cheiro verde, pimentão, couve manteiga, manga, alface, salsinha e coentro.',
    productsCount: 8,
    highlights: ['Comunidade Tapera', 'Verduras e temperos', 'Panelada / Galinha'],
    image: josefaPhoto,
    imagePosition: '50% 30%',
  },
  {
    slug: 'neutania-soares',
    name: 'Neutânia Soares',
    location: 'Cajueiros',
    community: 'Tabuleiro do Norte',
    category: 'Produtos Naturais',
    primaryProductGroup: 'pantry',
    brand: 'Sabor e Saúde',
    specialities: [
      'Colorau caseiro / Colorau líquido',
      'Pão',
      'Óleo de coco',
      'Chips de banana / Farinha de banana / Farinha de coco',
      'Sal temperado',
      'Farofa de soja',
      'Sais de banho / Sabonete de babosa com alecrim',
      'Escalda-pé',
      'Mamão',
      'Limão',
    ],
    products: [
      { name: 'Colorau caseiro / Colorau líquido', group: 'pantry', description: 'Colorau nas versões caseira e líquida para temperar suas receitas.', image: null },
      { name: 'Pão', group: 'pantry', description: 'Pão comercializado por Neutânia na feira.', image: null },
      { name: 'Óleo de coco', group: 'pantry', description: 'Óleo de coco da linha Sabor e Saúde.', image: null },
      { name: 'Chips de banana / Farinha de banana / Farinha de coco', group: 'pantry', description: 'Chips de banana e farinhas de banana e de coco.', image: null },
      { name: 'Sal temperado', group: 'pantry', description: 'Sal temperado para diferentes preparos do dia a dia.', image: null },
      { name: 'Farofa de soja', group: 'pantry', description: 'Farofa de soja para acompanhar refeições.', image: null },
      { name: 'Sais de banho / Sabonete de babosa com alecrim', group: 'care', description: 'Sais de banho e sabonete de babosa com alecrim para cuidados pessoais.', image: null },
      { name: 'Escalda-pé', group: 'care', description: 'Produto para o preparo de escalda-pés.', image: null },
      { name: 'Mamão', group: 'fruits', description: 'Fruta para consumir ao natural ou preparar vitaminas e saladas de frutas.', image: null },
      { name: 'Limão', group: 'fruits', description: 'Fruta para sucos, temperos e outras receitas.', image: null },
    ],
    description: 'Da comunidade Cajueiros, Neutânia participa da feira há aproximadamente 8 anos com a Sabor e Saúde, comercializando produtos naturais, pães e frutas.',
    story: 'Neutânia Soares é da comunidade Cajueiros, em Tabuleiro do Norte, e participa da feira há aproximadamente 8 anos. Com a Sabor e Saúde – Produtos Naturais, comercializa temperos, pão, óleo de coco, chips e farinhas, produtos de cuidado pessoal, mamão e limão.',
    productsCount: 10,
    experience: 'Aproximadamente 8 anos',
    highlights: ['Sabor e Saúde', 'Produtos naturais', 'Cerca de 8 anos na feira'],
    image: neutaniaPhoto,
    imagePosition: '50% 16%',
  },
  {
    slug: 'marinalva',
    name: 'Marinalva',
    location: 'Barra do Feijão',
    community: 'Tabuleiro do Norte',
    category: 'Mel',
    primaryProductGroup: 'pantry',
    specialities: ['Mel', 'Laranja', 'Bolo liso', 'Cuscuz recheado', 'Coco ralado', 'Café'],
    products: [
      { name: 'Mel', group: 'pantry', description: 'Mel comercializado por Marinalva na feira.', image: null },
      { name: 'Laranja', group: 'fruits', description: 'Fruta para consumir ao natural ou preparar sucos e outras receitas.', image: null },
      { name: 'Bolo liso', group: 'meals', description: 'Bolo liso para acompanhar o café ou compor o lanche.', image: null },
      { name: 'Cuscuz recheado', group: 'meals', description: 'Cuscuz recheado comercializado por Marinalva na feira.', image: null },
      { name: 'Coco ralado', group: 'pantry', description: 'Coco ralado para diferentes preparos e receitas.', image: null },
      { name: 'Café', group: 'drinks', description: 'Café disponível na banca de Marinalva.', image: null },
    ],
    description: 'Da comunidade Barra do Feijão, em Tabuleiro do Norte, Marinalva comercializa mel, laranja, bolo liso, cuscuz recheado, coco ralado e café.',
    story: 'Marinalva é da comunidade Barra do Feijão, em Tabuleiro do Norte. Na feira, comercializa mel, laranja, bolo liso, cuscuz recheado, coco ralado e café.',
    productsCount: 6,
    highlights: ['Comunidade Barra do Feijão', 'Mel e frutas', 'Bolo liso e cuscuz recheado'],
    image: marinalvaPhoto,
    imagePosition: '50% 16%',
  },
  {
    slug: 'nubia-moreira-maia',
    name: 'Núbia Moreira Maia',
    location: 'Gangorrinha',
    community: 'Tabuleiro do Norte',
    category: 'Comidas e Bebidas',
    primaryProductGroup: 'meals',
    specialities: ['Tapioca de forno', 'Caldo', 'Cuscuz temperado', 'Bandeja de ovos', 'Amendoim', 'Café', 'Bolo', 'Suco'],
    products: [
      { name: 'Tapioca de forno', group: 'meals', description: 'Tapioca de forno comercializada por Núbia na feira.', image: null },
      { name: 'Caldo', group: 'meals', description: 'Caldo disponível na banca de Núbia.', image: null },
      { name: 'Cuscuz temperado', group: 'meals', description: 'Cuscuz temperado para compor a refeição.', image: null },
      { name: 'Bandeja de ovos', group: 'pantry', description: 'Ovos comercializados em bandeja.', image: null },
      { name: 'Amendoim', group: 'pantry', description: 'Amendoim disponível na banca de Núbia.', image: null },
      { name: 'Café', group: 'drinks', description: 'Café para acompanhar o lanche ou a refeição.', image: null },
      { name: 'Bolo', group: 'meals', description: 'Bolo comercializado por Núbia na feira.', image: null },
      { name: 'Suco', group: 'drinks', description: 'Suco disponível na banca de Núbia.', image: null },
    ],
    description: 'Da comunidade Gangorrinha, em Tabuleiro do Norte, Núbia comercializa tapioca de forno, caldo, cuscuz temperado, ovos, amendoim, café, bolo e suco.',
    story: 'Núbia Moreira Maia é da comunidade Gangorrinha, em Tabuleiro do Norte. Na feira, comercializa tapioca de forno, caldo, cuscuz temperado, bandeja de ovos, amendoim, café, bolo e suco.',
    productsCount: 8,
    highlights: ['Comunidade Gangorrinha', 'Comidas e bebidas', 'Ovos e amendoim'],
    image: nubiaPhoto,
    imagePosition: '50% 16%',
  },
  {
    slug: 'ocimar',
    name: 'Ocimar',
    location: 'São Gerardo',
    community: 'Tabuleiro do Norte',
    category: 'Frutas',
    primaryProductGroup: 'fruits',
    specialities: ['Mamão', 'Cheiro verde', 'Banana', 'Limão', 'Jerimum'],
    products: [
      { name: 'Mamão', group: 'fruits', description: 'Fruta para consumir ao natural ou preparar vitaminas e saladas de frutas.', image: null },
      { name: 'Cheiro verde', group: 'vegetables', description: 'Tempero para diferentes preparos do dia a dia.', image: null },
      { name: 'Banana', group: 'fruits', description: 'Fruta para consumir ao natural ou usar em receitas.', image: null },
      { name: 'Limão', group: 'fruits', description: 'Fruta para sucos, temperos e outras receitas.', image: null },
      { name: 'Jerimum', group: 'vegetables', description: 'Jerimum para sopas, cozidos e acompanhamentos.', image: null },
    ],
    description: 'Da comunidade São Gerardo, Ocimar comercializa mamão, cheiro verde, banana, limão e jerimum.',
    story: 'Ocimar é da comunidade São Gerardo. Na feira, comercializa mamão, cheiro verde, banana, limão e jerimum.',
    productsCount: 5,
    highlights: ['Comunidade São Gerardo', 'Frutas', 'Cheiro verde e jerimum'],
    image: ocimarPhoto,
    imagePosition: '50% 55%',
  },
  {
    slug: 'francisca-diana-alves-de-almeida',
    name: 'Francisca Diana Alves de Almeida',
    location: 'Tapera',
    community: 'Tabuleiro do Norte',
    category: 'Mudas e Plantas',
    primaryProductGroup: 'plants',
    specialities: ['Mudas medicinais, frutíferas e ornamentais', 'Manga', 'Acerola', 'Limão', 'Tamarindo', 'Sementes de flores', 'Artesanatos de crochê'],
    products: [
      { name: 'Mudas medicinais, frutíferas e ornamentais', group: 'plants', description: 'Mudas de plantas medicinais, árvores frutíferas e plantas ornamentais.', image: null },
      { name: 'Manga', group: 'fruits', description: 'Fruta para consumir ao natural ou preparar sucos e sobremesas.', image: null },
      { name: 'Acerola', group: 'fruits', description: 'Fruta para sucos e outras receitas.', image: null },
      { name: 'Limão', group: 'fruits', description: 'Fruta para sucos, temperos e outras receitas.', image: null },
      { name: 'Tamarindo', group: 'fruits', description: 'Fruta para preparar sucos, doces e outras receitas.', image: null },
      { name: 'Sementes de flores', group: 'plants', description: 'Sementes de flores para plantio.', image: null },
      { name: 'Artesanatos de crochê', group: 'handicrafts', description: 'Peças de crochê comercializadas por Francisca na feira.', image: null },
    ],
    description: 'Da comunidade Tapera, em Tabuleiro do Norte, Francisca comercializa mudas medicinais, frutíferas e ornamentais, frutas, sementes de flores e artesanatos de crochê.',
    story: 'Francisca Diana Alves de Almeida é da comunidade Tapera, em Tabuleiro do Norte. Na feira, comercializa mudas medicinais, frutíferas e ornamentais, manga, acerola, limão, tamarindo, sementes de flores e artesanatos de crochê.',
    productsCount: 7,
    highlights: ['Comunidade Tapera', 'Mudas e sementes', 'Frutas e crochê'],
    image: franciscaDianaPhoto,
    imagePosition: '50% 40%',
  },
]

export const categories = [
  { id: 'all', label: 'Todos', color: 'green' } as const,
  ...productGroups.filter((group) => (
    producers.some((producer) => producer.products.some((product) => product.group === group.id))
  )),
]

export function getProducerProductGroups(producer: Producer) {
  return productGroups
    .map((group) => ({
      ...group,
      products: producer.products
        .filter((product) => product.group === group.id)
        .flatMap((product) => product.name.split(' / ')),
    }))
    .filter((group) => group.products.length > 0)
    .sort((first, second) => (
      Number(second.id === producer.primaryProductGroup) - Number(first.id === producer.primaryProductGroup)
    ))
}
