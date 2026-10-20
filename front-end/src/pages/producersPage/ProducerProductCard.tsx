import { useState } from 'react'
import type { ProducerProduct } from './producersData'

const ProducerProductCard = ({ product }: { product: ProducerProduct }) => {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const image = product.image !== failedImage ? product.image : null

  return (
    <li className="producer-product-card">
      <div className="producer-product-card-media">
        {image && (
          <img
            src={image}
            alt={product.name}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            onError={() => setFailedImage(image)}
          />
        )}
      </div>
      <div className="producer-product-card-content">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
      </div>
    </li>
  )
}

export default ProducerProductCard
