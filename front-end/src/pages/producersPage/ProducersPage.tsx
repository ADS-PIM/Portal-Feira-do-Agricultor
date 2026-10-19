import { useMemo, useState } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { categories, producers } from './producersData'
import './ProducersPage.css'

const ProducersPage = () => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')

  const filteredProducers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return producers.filter((producer) => {
      const matchesCategory = activeCategory === 'Todos' || producer.category === activeCategory
      const searchableText = [
        producer.name,
        producer.location,
        producer.community,
        producer.category,
        producer.specialities.join(' '),
      ].join(' ').toLowerCase()

      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery)

      return matchesCategory && matchesQuery
    })
  }, [activeCategory, query])

  return (
    <>
      <Header initialActiveLink="#/produtores" />

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

            <div className="producers-filter-list" aria-label="Categorias de produtores">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={activeCategory === category ? 'is-active' : ''}
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="producers-grid" aria-label="Lista de produtores da feira">
            {filteredProducers.length > 0 ? (
              filteredProducers.map((producer) => (
                <article key={producer.slug} className="producer-card">
                  <div className="producer-card-identity producer-card-identity--placeholder">
                    <span className="producer-card-category">{producer.category}</span>
                  </div>

                  <div className="producer-card-body">
                    <h2>{producer.name}</h2>
                    <div className="producer-card-location">
                      <span aria-hidden="true">◉</span>
                      {producer.location}
                    </div>

                    <p>{producer.description}</p>

                    <div className="producer-card-footer">
                      <button
                        type="button"
                        onClick={() => {
                          const nextPath = `#/produtor/${encodeURIComponent(producer.slug)}`
                          window.location.hash = nextPath
                        }}
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </div>
                </article>
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
