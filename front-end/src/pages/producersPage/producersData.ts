import josefaPhoto from '../../assets/producers/josefa-alexandre-barreto.jpeg'

export type ProducerProduct = {
  name: string
  description: string
  image: string | null
}

export type Producer = {
  slug: string
  name: string
  location: string
  community: string
  category: string
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

export const categories = ['Todos', 'Frutas', 'Verduras', 'Legumes', 'Artesanato', 'Mel', 'Orgânicos']

export const producers: Producer[] = [
  {
    slug: 'josefa-alexandre-barreto',
    name: 'Josefa Alexandre Barreto',
    location: 'Tapera',
    community: 'Tabuleiro do Norte',
    category: 'Verduras',
    specialities: ['Panelada / Galinha', 'Cheiro verde', 'Pimentão', 'Couve manteiga', 'Manga', 'Alface', 'Salsinha', 'Coentro'],
    products: [
      { name: 'Panelada / Galinha', description: 'Pratos comercializados por Josefa na feira.', image: null },
      { name: 'Cheiro verde', description: 'Tempero para diferentes preparos do dia a dia.', image: null },
      { name: 'Pimentão', description: 'Para saladas, refogados e outras receitas.', image: null },
      { name: 'Couve manteiga', description: 'Folhas para saladas, refogados e acompanhamentos.', image: null },
      { name: 'Manga', description: 'Fruta para consumir ao natural ou preparar sucos e sobremesas.', image: null },
      { name: 'Alface', description: 'Folhas para saladas e acompanhamentos.', image: null },
      { name: 'Salsinha', description: 'Erva para temperar e finalizar pratos.', image: null },
      { name: 'Coentro', description: 'Tempero para diferentes receitas.', image: null },
    ],
    description: 'Da comunidade Tapera, em Tabuleiro do Norte, Josefa comercializa panelada, galinha, verduras, temperos e manga.',
    story: 'Josefa Alexandre Barreto é da comunidade Tapera, em Tabuleiro do Norte. Na feira, comercializa panelada / galinha, cheiro verde, pimentão, couve manteiga, manga, alface, salsinha e coentro.',
    productsCount: 8,
    highlights: ['Comunidade Tapera', 'Verduras e temperos', 'Panelada / Galinha'],
    image: josefaPhoto,
    imagePosition: '50% 30%',
  },
  {
    slug: 'ze-do-corrego',
    name: 'Seu Zé do Córrego',
    location: 'Córrego da Areia',
    community: 'Tabuleiro do Norte',
    category: 'Verduras',
    specialities: ['Hortaliças', 'Folhagens', 'Legumes'],
    products: [
      { name: 'Hortaliças', description: 'Hortaliças da horta para saladas e preparos do dia a dia.', image: null },
      { name: 'Folhagens', description: 'Folhas para compor saladas, refogados e outras receitas.', image: null },
      { name: 'Legumes', description: 'Legumes do cultivo familiar para diferentes pratos.', image: null },
    ],
    description: 'Cultiva hortaliças e legumes frescos com atenção às práticas tradicionais e ao sabor da terra.',
    story: 'Há mais de 20 anos, Seu Zé trabalha com plantio familiar, cultivando alimentos que chegam direto da horta para a mesa da comunidade.',
    productsCount: 12,
    experience: '20 anos',
    highlights: ['Pontos de venda locais', 'Produção em pequena escala', 'Frescor diário'],
    image: null,
  },
  {
    slug: 'dona-maria-de-fatima',
    name: 'Dona Maria de Fátima',
    location: 'Sítio Olho d’Água',
    community: 'Tabuleiro do Norte',
    category: 'Frutas',
    specialities: ['Banana', 'Mamão', 'Doces caseiros'],
    products: [
      { name: 'Banana', description: 'Fruta tropical para consumir ao natural ou usar em receitas.', image: null },
      { name: 'Mamão', description: 'Mamão para o café da manhã, saladas de frutas e vitaminas.', image: null },
      { name: 'Doces caseiros', description: 'Doces preparados com receitas da família e sabores da região.', image: null },
    ],
    description: 'Especialista em frutas tropicais e receitas caseiras que valorizam o sabor e a origem da região.',
    story: 'Dona Maria cresceu no campo e transformou sua produção em um trabalho de família, sempre com foco na qualidade e no cuidado com o cultivo.',
    productsCount: 24,
    experience: '18 anos',
    highlights: ['Frutas da estação', 'Doces artesanais', 'Produção familiar'],
    image: null,
  },
  {
    slug: 'francisco-da-barra',
    name: 'Francisco da Barra',
    location: 'Distrito da Barra',
    community: 'Tabuleiro do Norte',
    category: 'Legumes',
    specialities: ['Mandioca', 'Inhame', 'Raízes'],
    products: [
      { name: 'Mandioca', description: 'Mandioca do cultivo regional para receitas cozidas ou assadas.', image: null },
      { name: 'Inhame', description: 'Tubérculo para sopas, purês e acompanhamentos.', image: null },
      { name: 'Raízes', description: 'Raízes presentes na produção e na culinária da região.', image: null },
    ],
    description: 'Seu Francisco produz tubérculos e raízes com muita tradição e dedicação ao cultivo regional.',
    story: 'A família de Francisco mantém a produção de raízes e alimentos básicos com técnicas que passaram de geração para geração.',
    productsCount: 8,
    experience: '15 anos',
    highlights: ['Cultivos de raiz', 'Tempo de produção sustentável', 'Apoio à agricultura familiar'],
    image: null,
  },
  {
    slug: 'chicao-do-mel',
    name: 'Chicão do Mel',
    location: 'Comunidade Patos',
    community: 'Tabuleiro do Norte',
    category: 'Mel',
    specialities: ['Mel', 'Queijo', 'Laticínios'],
    products: [
      { name: 'Mel', description: 'Mel para acompanhar frutas, pães e outras receitas.', image: null },
      { name: 'Queijo', description: 'Queijo caseiro que faz parte da tradição local.', image: null },
      { name: 'Laticínios', description: 'Derivados do leite para compor refeições e lanches.', image: null },
    ],
    description: 'Mantém viva a tradição da produção de queijo e pequenos cultivos com atenção à qualidade do alimento.',
    story: 'Chicão combina a tradição do campo com a criação de pequenos produtos artesanais, fortalecendo a economia local.',
    productsCount: 6,
    experience: '12 anos',
    highlights: ['Mel artesanal', 'Queijo caseiro', 'Tradição local'],
    image: null,
  },
  {
    slug: 'dona-francisca-das-flores',
    name: 'Dona Francisca das Flores',
    location: 'Sítio Santo Antônio',
    community: 'Tabuleiro do Norte',
    category: 'Artesanato',
    specialities: ['Flores', 'Cestas', 'Artesanato'],
    products: [
      { name: 'Flores', description: 'Flores da região para decorar e presentear.', image: null },
      { name: 'Cestas', description: 'Cestas trançadas à mão para organizar e decorar.', image: null },
      { name: 'Artesanato', description: 'Peças feitas à mão com referências da cultura local.', image: null },
    ],
    description: 'Trança cestas e cuida das flores da região com arte, dedicação e valor cultural.',
    story: 'Dona Francisca carrega o ofício de sua família e embeleza a feira com flores e peças artesanais feitas à mão.',
    productsCount: 15,
    experience: '25 anos',
    highlights: ['Produtos artesanais', 'Flores regionais', 'Trabalho manual'],
    image: null,
  },
  {
    slug: 'seu-antonio-das-frutas',
    name: 'Seu Antônio das Frutas',
    location: 'Distrito da Barra',
    community: 'Tabuleiro do Norte',
    category: 'Orgânicos',
    specialities: ['Frutas', 'Orgânicos', 'Produtos da temporada'],
    products: [
      { name: 'Frutas', description: 'Frutas locais para consumir ao natural e preparar receitas.', image: null },
      { name: 'Orgânicos', description: 'Exemplos de produtos da linha de orgânicos do produtor.', image: null },
      { name: 'Produtos da temporada', description: 'Produtos que acompanham a época de colheita da região.', image: null },
    ],
    description: 'Colheita de frutas locais com produção cuidadosa e foco em sabores marcantes da região.',
    story: 'Seu Antônio trabalha com pequenos lotes de fruta, sempre com foco em qualidade, sabor e autenticidade da produção local.',
    productsCount: 10,
    experience: '16 anos',
    highlights: ['Frutas orgânicas', 'Colheita local', 'Qualidade constante'],
    image: null,
  },
]

export function getProducerBySlug(slug: string) {
  return producers.find((producer) => producer.slug === slug) ?? null
}
