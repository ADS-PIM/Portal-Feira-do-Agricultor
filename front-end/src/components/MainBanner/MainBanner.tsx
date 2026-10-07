import { useEffect, useState } from 'react'
import feiraImage from '../../assets/Placeholder-Feira-de-Agricultura.jpg'
import { getBusinessInfo, type BusinessInfo } from '../../services/businessInfoService'
import { defaultBusinessDescription } from '../../utils/businessDescription'
import './MainBanner.css'

const MainBanner = () => {
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)

    useEffect(() => {
        const controller = new AbortController()

        const loadBusinessInfo = async () => {
            try {
                setBusinessInfo(await getBusinessInfo(controller.signal))
            } catch {
                if (!controller.signal.aborted) {
                    setBusinessInfo(null)
                }
            }
        }

        void loadBusinessInfo()
        return () => controller.abort()
    }, [])

    const description = businessInfo?.description?.trim() || defaultBusinessDescription

    return (
        <div id="inicio" className="MainBanner">
            <img src={feiraImage} alt="Imagem de uma feira de agricultores" />
            <h1>Direto do campo para a sua mesa</h1>
            <p>{description}</p>
            <div className="MainBanner-buttons">
                <a href="#/calendario">Ver Eventos</a>
                <a href="#sobre">Conhecer Agricultores</a>
            </div>
        </div>
    )
}

export default MainBanner