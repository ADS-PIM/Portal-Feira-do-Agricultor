import feiraImage from '../../assets/main_banner_protal.jpg'
import { defaultBusinessDescription } from '../../utils/businessDescription'
import './MainBanner.css'

const MainBanner = () => {
    return (
        <div id="inicio" className="MainBanner">
            <img src={feiraImage} alt="Imagem de uma feira de agricultores" />
            <h1>Direto do campo para a sua mesa</h1>
            <p>{defaultBusinessDescription}</p>
            <div className="MainBanner-buttons">
                <a href="/calendario">Ver Eventos</a>
                <a href="/produtores">Conhecer produtores</a>
            </div>
        </div>
    )
}

export default MainBanner
