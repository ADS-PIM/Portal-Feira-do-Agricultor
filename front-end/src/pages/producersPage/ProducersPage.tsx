import { useMemo, useState } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import ProducerCard from '../../components/ProducerCard/ProducerCard'
import { categories, producers } from './producersData'
import './ProducersPage.css'

type CategoryId = typeof categories[number]['id']
type ProductCategoryId = Exclude<CategoryId, 'all'>

const ProducersPage = () => {
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeCategories, setActiveCategories] = useState<ProductCategoryId[]>([])
  const activeFilterCount = activeCategories.length

  const isCategoryActive = (categoryId: CategoryId) => categoryId === 'all'
    ? activeFilterCount === 0
    : activeCategories.includes(categoryId)

  const toggleCategory = (categoryId: CategoryId) => {
    if (categoryId === 'all') {
      setActiveCategories([])
      return
    }

    setActiveCategories((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId])
  }

  const filteredProducers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return producers.filter((producer) => {
      const matchesCategory = activeCategories.length === 0
        || producer.products.some((product) => activeCategories.includes(product.group))
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
  }, [activeCategories, query])

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
            <div className="producers-search-row">
              <label className="producers-search" aria-label="Buscar produtor por nome">
                <span className="producers-search-icon" aria-hidden="true">⌕</span>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Digite o nome de um produtor, produto ou local"
                />
              </label>
              <button
                type="button"
                className={`producers-filter-toggle${activeFilterCount > 0 ? ' has-active-filter' : ''}`}
                aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ${activeFilterCount === 1 ? 'ativo' : 'ativos'})` : 'Filtros'}
                aria-expanded={filtersOpen}
                aria-controls="producers-category-filters"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Icon name="sliders" />
                Filtros{activeFilterCount > 0 && <span className="producers-filter-count" aria-hidden="true">{activeFilterCount}</span>}
              </button>
            </div>

            <div id="producers-category-filters" className="producers-filter-list" role="group" aria-label="Filtrar produtores por tipo de produto" hidden={!filtersOpen}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`producer-filter--${category.color}${isCategoryActive(category.id) ? ' is-active' : ''}`}
                  aria-pressed={isCategoryActive(category.id)}
                  onClick={() => toggleCategory(category.id)}
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
