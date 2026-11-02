import { ValidateBy } from 'class-validator';
import { getContactEmailValidation, getContactPhoneValidation } from '../util/contactValidation';

export const IsContact = (field: 'email' | 'phone') => {
    const getError = field === 'email' ? getContactEmailValidation : getContactPhoneValidation;
    return ValidateBy({
        name: field === 'email' ? 'isContactEmail' : 'isContactPhone',
        validator: {
            validate: (value: unknown) => getError(value) === null,
            defaultMessage: args => getError(args?.value)?.message ?? '',
        },
    });
};
