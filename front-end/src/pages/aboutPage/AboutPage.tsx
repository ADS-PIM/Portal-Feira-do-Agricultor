import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import './AboutPage.css'

const AboutPage = () => (
  <>
    <Header initialActiveLink="/sobre" />
    <main className="about-page" aria-labelledby="about-page-title">
      <div className="about-page-shell">
        <h1 id="about-page-title">Sobre nós</h1>
        <div className="about-page-story">
          {/* Espaço reservado para a história e as imagens que serão fornecidas. */}
        </div>
      </div>
    </main>
    <Footer />
  </>
)

export default AboutPage
