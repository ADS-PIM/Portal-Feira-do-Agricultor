import { getProducerProductGroups, type Producer } from '../../pages/producersPage/producersData'
import './ProducerCard.css'

type ProducerCardProps = {
  producer: Producer
}

const ProducerCard = ({ producer }: ProducerCardProps) => {
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
        <span className="producer-card-category">{producer.category}</span>
      </div>

      <div className="producer-card-body">
        <h2 className="producer-card-title">{producer.name}</h2>
        <div className="producer-card-location">
          <span>{producer.location}, {producer.community}</span>
        </div>

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
    </article>
  )
}

export default ProducerCard
