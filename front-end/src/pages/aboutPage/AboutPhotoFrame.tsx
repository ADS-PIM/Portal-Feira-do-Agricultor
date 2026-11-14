import Icon from '../../components/Icon'
import type { AboutPhoto } from './aboutContent'

type Props = { photo: AboutPhoto; caption: string; className?: string }

export default function AboutPhotoFrame({ photo, caption, className = '' }: Props) {
    return (
        <figure className={`about-photo ${className}${photo.src ? '' : ' is-reserved'}`}>
            <div className="about-photo-visual">
                {photo.src ? (
                    <img src={photo.src} alt={photo.alt} style={{ objectPosition: photo.position }} loading="lazy" decoding="async" />
                ) : (
                    <div className="about-photo-placeholder">
                        <span className="about-photo-icon"><Icon name="image" /></span>
                        <span>Registro da feira em breve</span>
                    </div>
                )}
            </div>
            <figcaption>{caption}</figcaption>
        </figure>
    )
}
