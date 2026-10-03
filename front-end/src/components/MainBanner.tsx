import feiraImage from '../assets/Placeholder-Feira-de-Agricultura.jpg'
import './MainBanner.css'

const MainBanner = () => {
    return (
        <div id="inicio" className="MainBanner">
            <img src={feiraImage} alt="Imagem de uma feira de agricultores" />
            <h1>Direto do campo para a sua mesa</h1>
            <p>Conheça e apoie o trabalho dos agricultores de sua região. Descubra os produtos rescos e os eventos do Brotando Feiras de Tabuleiro do Norte, Ceará.</p>
            <div className="MainBanner-buttons">
                <button>Ver Eventos</button>
                <button>Conhecer Agricultores</button>
            </div>
        </div>
    )
}

export default MainBanner