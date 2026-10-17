import Icon from '../../components/Icon'
import './CreateEventButton.css'

export default function CreateEventButton({ onClick }: { onClick: () => void }) {
    return (
        <button type="button" className="admin-create-event" onClick={onClick} aria-label="Novo evento" title="Novo evento">
            <Icon name="plus" />
            <span className="admin-create-event-label">Novo evento</span>
        </button>
    )
}
