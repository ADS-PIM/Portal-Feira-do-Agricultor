import Icon from '../../components/Icon'
import './CreateEventButton.css'

type CreateEventButtonProps = {
    onClick: () => void
    label?: string
    className?: string
}

export default function CreateEventButton({ onClick, label = 'Novo evento', className = '' }: CreateEventButtonProps) {
    return (
        <button type="button" className={`admin-primary-action admin-create-event ${className}`.trim()} onClick={onClick} aria-label={label} title={label}>
            <Icon name="plus" />
            <span className="admin-primary-action-label">{label}</span>
        </button>
    )
}
