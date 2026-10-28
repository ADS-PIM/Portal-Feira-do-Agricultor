import './EventLoading.css'

const EventLoading = ({ message }: { message: string }) => (
    <div className="event-loading" role="status">
        <span className="event-loading-spinner" aria-hidden="true" />
        <p>{message}</p>
    </div>
)

export default EventLoading
