import { useEffect, useRef, useState } from 'react'
import { getProducerProductGroups, type Producer } from '../../pages/producersPage/producersData'
import Icon from '../Icon'
import './ProducerCard.css'

type ProducerCardProps = {
  producer: Producer
}

const ProducerCard = ({ producer }: ProducerCardProps) => {
  const [productsOpen, setProductsOpen] = useState(false)
  const [productsHeight, setProductsHeight] = useState(0)
  const productsContentRef = useRef<HTMLDivElement>(null)
  const productsId = `${producer.slug}-products`

  useEffect(() => {
    const content = productsContentRef.current
    if (!content) return

    const observer = new ResizeObserver(() => {
      setProductsHeight(content.getBoundingClientRect().height)
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return (
    <article className="producer-card">
      <div className={`producer-card-identity${producer.image ? '' : ' producer-card-identity--placeholder'}`}>
        {producer.image && (
          <img
            className="producer-card-photo"
            src={producer.image}
            alt={producer.name}
            style={{ objectPosition: producer.imagePosition }}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      <div className="producer-card-body">
        <h2 className="producer-card-title">{producer.name}</h2>
        <div className="producer-card-location">
          <Icon name="location" />
          <span>{producer.location}, {producer.community}</span>
        </div>

        <div className="producer-card-products-disclosure">
          <button
            type="button"
            className="producer-card-products-toggle"
            aria-expanded={productsOpen}
            aria-controls={productsId}
            aria-label={`${productsOpen ? 'Ocultar' : 'Ver'} produtos de ${producer.name}`}
            onClick={() => setProductsOpen((open) => !open)}
          >
            Ver produtos
          </button>
          <div
            id={productsId}
            className={`producer-card-products-panel${productsOpen ? ' is-open' : ''}`}
            style={{ height: productsOpen ? productsHeight : 0 }}
            inert={!productsOpen}
          >
            <div ref={productsContentRef} className="producer-card-products-clip">
              <div className="producer-card-products">
                {getProducerProductGroups(producer).map((group) => (
                  <section
                    key={group.id}
                    className={`producer-product-group producer-product-group--${group.color}`}
                    aria-labelledby={`${producer.slug}-${group.id}`}
                  >
                    <h3 className="producer-product-group-title" id={`${producer.slug}-${group.id}`}>
                      {group.label}
                    </h3>
                    <ul aria-labelledby={`${producer.slug}-${group.id}`}>
                      {group.products.map((product) => (
                        <li key={product}>{product}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default ProducerCard
