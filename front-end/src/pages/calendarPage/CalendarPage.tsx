import Header from '../../components/Header/Header'
import Calendar from '../../components/Calendar/Calendar'
import Footer from '../../components/Footer/Footer'
import './CalendarPage.css'

const CalendarPage = () => {
    return (
        <>
            <Header initialActiveLink="#/calendario" />
            <main className="calendar-page">
                <header className="calendar-page-header">
                    <p>FIQUE POR DENTRO</p>
                    <h1>Calendário de Eventos</h1>
                    <span>Confira os eventos programados e navegue pelos meses do ano.</span>
                </header>
                <Calendar />
            </main>
            <Footer />
        </>
    )
}

export default CalendarPage