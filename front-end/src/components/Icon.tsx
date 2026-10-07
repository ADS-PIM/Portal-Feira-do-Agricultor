import type { CSSProperties } from 'react'
import {
    faArrowLeft,
    faArrowRight,
    faCalculator,
    faCalendarDays,
    faChevronLeft,
    faChevronRight,
    faCircleInfo,
    faCircleExclamation,
    faClock,
    faComments,
    faEnvelope,
    faEye,
    faEyeSlash,
    faFilter,
    faImage,
    faLocationDot,
    faMagnifyingGlass,
    faMapLocationDot,
    faMessage,
    faPenToSquare,
    faPlus,
    faSeedling,
    faSliders,
    faTableCellsLarge,
    faTrash,
    faUser,
    faUserShield,
    faUsers,
    faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { faInstagram, faWhatsapp } from '@fortawesome/free-brands-svg-icons'

const icons = {
    arrowLeft: faArrowLeft,
    arrowRight: faArrowRight,
    calculator: faCalculator,
    dashboard: faTableCellsLarge,
    calendar: faCalendarDays,
    chevronLeft: faChevronLeft,
    chevronRight: faChevronRight,
    error: faCircleExclamation,
    information: faCircleInfo,
    clock: faClock,
    comments: faComments,
    email: faEnvelope,
    eye: faEye,
    eyeSlash: faEyeSlash,
    filter: faFilter,
    image: faImage,
    instagram: faInstagram,
    location: faLocationDot,
    magnifyingGlass: faMagnifyingGlass,
    map: faMapLocationDot,
    message: faMessage,
    edit: faPenToSquare,
    plus: faPlus,
    seedling: faSeedling,
    sliders: faSliders,
    trash: faTrash,
    user: faUser,
    userShield: faUserShield,
    users: faUsers,
    whatsapp: faWhatsapp,
    close: faXmark,
} as const

export type IconName = keyof typeof icons

function Icon({
    name,
    className,
    style,
}: {
    name: IconName
    className?: string
    style?: CSSProperties
}) {
    const [width, height, , , pathData] = icons[name].icon
    const paths = Array.isArray(pathData) ? pathData : [pathData]

    return (
        <svg
            className={['font-awesome-icon', className].filter(Boolean).join(' ')}
            viewBox={`0 0 ${width} ${height}`}
            style={style}
            aria-hidden="true"
            focusable="false"
        >
            {paths.map((path, index) => <path key={index} d={path} fill="currentColor" stroke="none" />)}
        </svg>
    )
}

export default Icon
