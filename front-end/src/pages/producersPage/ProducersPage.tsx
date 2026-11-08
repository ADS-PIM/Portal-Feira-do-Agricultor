import { useMemo, useState } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import ProducerCard from '../../components/ProducerCard/ProducerCard'
import { categories, producers } from './producersData'
import './ProducersPage.css'

const ProducersPage = () => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]['id']>('all')

  const filteredProducers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return producers.filter((producer) => {
      const matchesCategory = activeCategory === 'all'
        || producer.products.some((product) => product.group === activeCategory)
      const searchableText = [
        producer.name,
        producer.location,
        producer.community,
        producer.category,
        producer.brand,
        producer.products.map((product) => product.name).join(' '),
      ].join(' ').toLowerCase()

      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery)

      return matchesCategory && matchesQuery
    })
  }, [activeCategory, query])

  return (
    <>
      <Header initialActiveLink="/produtores" />

      <main className="producers-page">
        <div className="producers-page-shell">
          <header className="producers-page-header">
            <h1>Conheça Nossos Produtores</h1>
            <p>
              Apoiando a agricultura familiar de Tabuleiro do Norte. Descubra quem planta, cuida e colhe os alimentos mais frescos que chegam à sua mesa.
            </p>
          </header>

          <section className="producers-toolbar" aria-label="Busca e filtros de produtores">
            <label className="producers-search" aria-label="Buscar produtor por nome">
              <span className="producers-search-icon" aria-hidden="true">⌕</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite seu nome..."
              />
            </label>

            <div className="producers-filter-list" role="group" aria-label="Filtrar produtores por tipo de produto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`producer-filter--${category.color}${activeCategory === category.id ? ' is-active' : ''}`}
                  aria-pressed={activeCategory === category.id}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </section>

          <section className="producers-grid" aria-label="Lista de produtores da feira">
            {filteredProducers.length > 0 ? (
              filteredProducers.map((producer) => (
                <ProducerCard key={producer.slug} producer={producer} />
              ))
            ) : (
              <div className="producer-empty-state" role="status">
                <h2>Nenhum produtor encontrado</h2>
                <p>Tente outra busca ou selecione outra categoria.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}

export default ProducersPage
