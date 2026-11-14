import type { IconName } from '../../components/Icon'

// Add the chosen photo imports here, then replace each src and alt below.
// No stock or generated photos stand in for the actual community.
export type AboutPhoto = { src: string | null; alt: string; position?: string }
export const aboutPhotos: Record<'community' | 'history' | 'women', AboutPhoto> = {
    community: { src: null, alt: 'Encontro de feirantes e visitantes na Praça da Matriz' },
    history: { src: null, alt: 'Registro da caminhada da feira e de suas famílias' },
    women: { src: null, alt: 'Mulheres feirantes apresentando o fruto do seu trabalho' },
}

// Based on the supplied Caminhada (Oct/2026), pp. 3–5, and Estatuto, pp. 1–2.
// The sources differ on the starting year; the narrative does not fix that date.
export const aboutJourney = [
    {
        title: 'Tudo começa com as famílias',
        text: 'A feira nasceu das ações do projeto Comunidades Vivas, com o apoio do Instituto Brotar. Famílias se reuniram para mostrar e vender o que produziam no semiárido.',
    },
    {
        title: 'Uma pausa e um novo começo',
        text: 'O fim do projeto e a pandemia interromperam as vendas. Com novas parcerias e a chegada de outras famílias, o grupo retomou os encontros.',
    },
    {
        title: 'Um nome, muitas histórias',
        text: 'Em 2024, a feira ganhou o nome Brotando Feira. Na Praça da Matriz, a caminhada continua, aproximando o campo e a cidade.',
    },
]

export const aboutValues: { icon: IconName; title: string; text: string; color: string }[] = [
    { icon: 'seedling', title: 'Cuidado com a terra', color: 'green', text: 'Valorizamos a agroecologia: um jeito de produzir que cuida da terra e busca reduzir o uso de agrotóxicos.' },
    { icon: 'store', title: 'Trabalho valorizado', color: 'orange', text: 'A venda direta e o preço justo ajudam a renda a ficar com quem produz e movimentam a economia da comunidade.' },
    { icon: 'users', title: 'Decisões em conjunto', color: 'pink', text: 'A feira é organizada pelo grupo. Reuniões e formações ajudam a cuidar desse espaço e de quem faz parte dele.' },
    { icon: 'comments', title: 'Saberes que se encontram', color: 'green', text: 'Receitas, plantas, artesanato e conversas valorizam nossa cultura e aproximam as gerações.' },
]
