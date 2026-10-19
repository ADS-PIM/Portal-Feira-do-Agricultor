export type Producer = {
  slug: string
  name: string
  location: string
  community: string
  category: string
  specialities: string[]
  description: string
  story: string
  productsCount: number
  experience: string
  highlights: string[]
  image: string
}

export const categories = ['Todos', 'Frutas', 'Verduras', 'Legumes', 'Artesanato', 'Mel', 'Orgânicos']

export const producers: Producer[] = [
  {
    slug: 'ze-do-corrego',
    name: 'Seu Zé do Córrego',
    location: 'Córrego da Areia',
    community: 'Tabuleiro do Norte',
    category: 'Verduras',
    specialities: ['Hortaliças', 'Folhagens', 'Legumes'],
    description: 'Cultiva hortaliças e legumes frescos com atenção às práticas tradicionais e ao sabor da terra.',
    story: 'Há mais de 20 anos, Seu Zé trabalha com plantio familiar, cultivando alimentos que chegam direto da horta para a mesa da comunidade.',
    productsCount: 12,
    experience: '20 anos',
    highlights: ['Pontos de venda locais', 'Produção em pequena escala', 'Frescor diário'],
    image: 'https://images.unsplash.com/photo-1464226184884-fa52ac9c0cdd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'dona-maria-de-fatima',
    name: 'Dona Maria de Fátima',
    location: 'Sítio Olho d’Água',
    community: 'Tabuleiro do Norte',
    category: 'Frutas',
    specialities: ['Banana', 'Mamão', 'Doces caseiros'],
    description: 'Especialista em frutas tropicais e receitas caseiras que valorizam o sabor e a origem da região.',
    story: 'Dona Maria cresceu no campo e transformou sua produção em um trabalho de família, sempre com foco na qualidade e no cuidado com o cultivo.',
    productsCount: 24,
    experience: '18 anos',
    highlights: ['Frutas da estação', 'Doces artesanais', 'Produção familiar'],
    image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'francisco-da-barra',
    name: 'Francisco da Barra',
    location: 'Distrito da Barra',
    community: 'Tabuleiro do Norte',
    category: 'Legumes',
    specialities: ['Mandioca', 'Inhame', 'Raízes'],
    description: 'Seu Francisco produz tubérculos e raízes com muita tradição e dedicação ao cultivo regional.',
    story: 'A família de Francisco mantém a produção de raízes e alimentos básicos com técnicas que passaram de geração para geração.',
    productsCount: 8,
    experience: '15 anos',
    highlights: ['Cultivos de raiz', 'Tempo de produção sustentável', 'Apoio à agricultura familiar'],
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'chicao-do-mel',
    name: 'Chicão do Mel',
    location: 'Comunidade Patos',
    community: 'Tabuleiro do Norte',
    category: 'Mel',
    specialities: ['Mel', 'Queijo', 'Laticínios'],
    description: 'Mantém viva a tradição da produção de queijo e pequenos cultivos com atenção à qualidade do alimento.',
    story: 'Chicão combina a tradição do campo com a criação de pequenos produtos artesanais, fortalecendo a economia local.',
    productsCount: 6,
    experience: '12 anos',
    highlights: ['Mel artesanal', 'Queijo caseiro', 'Tradição local'],
    image: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'dona-francisca-das-flores',
    name: 'Dona Francisca das Flores',
    location: 'Sítio Santo Antônio',
    community: 'Tabuleiro do Norte',
    category: 'Artesanato',
    specialities: ['Flores', 'Cestas', 'Artesanato'],
    description: 'Trança cestas e cuida das flores da região com arte, dedicação e valor cultural.',
    story: 'Dona Francisca carrega o ofício de sua família e embeleza a feira com flores e peças artesanais feitas à mão.',
    productsCount: 15,
    experience: '25 anos',
    highlights: ['Produtos artesanais', 'Flores regionais', 'Trabalho manual'],
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'seu-antonio-das-frutas',
    name: 'Seu Antônio das Frutas',
    location: 'Distrito da Barra',
    community: 'Tabuleiro do Norte',
    category: 'Orgânicos',
    specialities: ['Frutas', 'Orgânicos', 'Produtos da temporada'],
    description: 'Colheita de frutas locais com produção cuidadosa e foco em sabores marcantes da região.',
    story: 'Seu Antônio trabalha com pequenos lotes de fruta, sempre com foco em qualidade, sabor e autenticidade da produção local.',
    productsCount: 10,
    experience: '16 anos',
    highlights: ['Frutas orgânicas', 'Colheita local', 'Qualidade constante'],
    image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1200&q=80',
  },
]

export function getProducerBySlug(slug: string) {
  return producers.find((producer) => producer.slug === slug) ?? null
}
