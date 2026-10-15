import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { getProducerBySlug } from './producersData'
import './ProducerProfilePage.css'

type ProducerProfilePageProps = {
  producerSlug: string
}

const ProducerProfilePage = ({ producerSlug }: ProducerProfilePageProps) => {
  const producer = getProducerBySlug(producerSlug)

  if (!producer) {
    return (
      <>
        <Header initialActiveLink="#/produtores" />
        <main className="producer-profile-page">
          <div className="producer-profile-shell">
            <section className="producer-profile-empty" role="alert">
              <h1>Produtor não encontrado</h1>
              <p>Não foi possível localizar este perfil no momento.</p>
              <a href="#/produtores">Voltar para produtores</a>
            </section>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header initialActiveLink="#/produtores" />

      <main className="producer-profile-page">
        <div className="producer-profile-shell">
          <nav className="producer-profile-breadcrumb" aria-label="Breadcrumb">
            <a href="#/">Início</a>
            <span>›</span>
            <a href="#/produtores">Produtores</a>
            <span>›</span>
            <strong>{producer.name}</strong>
          </nav>

          <section className="producer-profile-hero">
            <div className="producer-profile-copy">
              <span className="producer-profile-category">
                {producer.specialities.slice(0, 2).join(' e ').toUpperCase()}
              </span>

              <h1>{producer.name}</h1>

              <p className="producer-profile-location">
                <span aria-hidden="true">•</span>
                {producer.location} • {producer.community}
              </p>

              <p className="producer-profile-summary">
                {producer.description}
              </p>
            </div>

            <div className="producer-profile-visual producer-profile-visual--placeholder">
              <div className="producer-profile-hero-badge">
                <span aria-hidden="true">✦</span>
                Da agricultura familiar, para sua mesa
              </div>
            </div>
          </section>

          <section className="producer-profile-details">
            <div className="producer-profile-tabs" aria-label="Informações do produtor">
              <button type="button" className="is-active" aria-pressed="true">
                Sobre o produtor
              </button>
            </div>

            <div className="producer-profile-detail-grid producer-profile-single-column">
              <div className="producer-profile-story-panel">
                <span className="producer-profile-section-tag">{producer.location.toUpperCase()} • {producer.community.toUpperCase()}</span>

                <h2>
                  Uma vida plantando.<br />
                  Uma comunidade colhendo.
                </h2>

                <p>{producer.story}</p>

                <p>
                  Em {producer.location}, sua horta é cuidada em família. Da semente ao cuidado diário, cada etapa do cultivo é feita com atenção, respeito e tradição.
                </p>

                <blockquote>
                  “O que a gente leva pra feira é o mesmo que põe na mesa de casa.”
                </blockquote>

                <div className="producer-profile-signature">
                  <span>{producer.name}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}

export default ProducerProfilePage
