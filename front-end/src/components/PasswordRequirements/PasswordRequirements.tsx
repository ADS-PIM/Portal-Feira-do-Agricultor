import { passwordRequirements } from '../../utils/passwordPolicy'
import './PasswordRequirements.css'

export default function PasswordRequirements({ id, password, confirmationFor }: {
    id: string; password: string; confirmationFor?: string
}) {
    const rules = passwordRequirements.map(rule => ({ label: rule.label, met: rule.check(password) }))
    if (confirmationFor !== undefined) rules.push({ label: 'As senhas devem coincidir', met: Boolean(password) && password === confirmationFor })
    return <ul id={id} className="password-requirements" aria-label="Requisitos da senha" aria-live="polite" aria-atomic="true">
        {rules.map(rule => <li key={rule.label} className={rule.met ? 'is-met' : password ? 'is-unmet' : ''}>
            <span aria-hidden="true">{rule.met ? '✓' : '○'}</span>
            <span className="password-requirements-sr">{rule.met ? 'Atendido: ' : 'Pendente: '}</span>
            {rule.label}
        </li>)}
    </ul>
}
