import { Resolver } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import { AdminActionError } from '../model/adminActionError';

const listedDomains: string[] = require('disposable-domains');
const disposableDomains = new Set(listedDomains.map(domain => domainToASCII(domain).toLowerCase()));
const resolver = new Resolver({ timeout: 1500, tries: 2 });

function domainError() {
    return new AdminActionError(400, 'ADMIN_EMAIL_DOMAIN_INVALID', 'Email domain cannot receive mail');
}

function unavailableError() {
    return new AdminActionError(503, 'ADMIN_EMAIL_DNS_UNAVAILABLE', 'Email domain verification temporarily unavailable');
}

async function hasMailRoute(domain: string): Promise<boolean> {
    try {
        const records = await resolver.resolveMx(domain);
        if (records.length > 0) {
            // Node may represent a null MX (".") as an empty exchange.
            return records.some(({ exchange }) => exchange !== '' && exchange !== '.');
        }
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOTFOUND') return false;
        if (code !== 'ENODATA') throw unavailableError();
    }

    // SMTP falls back to the domain's own address when there is no MX record.
    const addresses = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
    if (addresses.some(answer => answer.status === 'fulfilled' && answer.value.length > 0)) return true;
    for (const answer of addresses) {
        if (answer.status === 'rejected' && !['ENODATA', 'ENOTFOUND'].includes(answer.reason.code)) {
            throw unavailableError();
        }
    }
    return false;
}

export async function validateRegistrationEmailDomain(email: string): Promise<void> {
    const domain = domainToASCII(email.slice(email.lastIndexOf('@') + 1)).toLowerCase();
    if (!domain) throw domainError();

    const labels = domain.split('.');
    while (labels.length > 0) {
        if (disposableDomains.has(labels.join('.'))) {
            throw new AdminActionError(400, 'ADMIN_EMAIL_DISPOSABLE', 'Disposable email addresses are not accepted');
        }
        labels.shift();
    }
    if (!await hasMailRoute(domain)) throw domainError();
}
