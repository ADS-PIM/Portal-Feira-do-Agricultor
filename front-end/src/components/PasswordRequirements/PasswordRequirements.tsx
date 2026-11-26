import { passwordRequirements } from '../../utils/passwordPolicy'
import './PasswordRequirements.css'

export default function PasswordRequirements({ id, password, confirmationFor }: {
    id: string; password: string; confirmationFor?: string
}) {
    const isConfirmation = confirmationFor !== undefined
    const rules = isConfirmation
        ? [{ label: 'As senhas devem coincidir', met: Boolean(password) && password === confirmationFor }]
        : passwordRequirements.map(rule => ({ label: rule.label, met: rule.check(password) }))
    return <ul id={id} className="password-requirements" aria-label={isConfirmation ? 'Confirmação da senha' : 'Requisitos da senha'} aria-live="polite" aria-atomic="true">
        {rules.map(rule => <li key={rule.label} className={rule.met ? 'is-met' : password ? 'is-unmet' : ''}>
            <span aria-hidden="true">{rule.met ? '✓' : '○'}</span>
            <span className="password-requirements-sr">{rule.met ? 'Atendido: ' : 'Pendente: '}</span>
            {rule.label}
        </li>)}
    </ul>
}
