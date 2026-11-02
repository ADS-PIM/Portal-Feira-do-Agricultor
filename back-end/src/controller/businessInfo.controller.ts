import { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { BusinessInfoCreateDTO, BusinessInfoUpdateDTO, BUSINESS_DESCRIPTION_TOO_LONG,
    BUSINESS_WHATSAPP_ERROR, BUSINESS_INSTAGRAM_ERROR, BUSINESS_EMAIL_ERROR } from '../dto/businessInfo.dto';
import { BusinessInfoService } from '../service/businessInfo.service';
import { AuthRequest } from '../../authMiddleware';
import { getInstagramAccountError } from '../util/instagramAccount';
import { getContactEmailValidation, getContactPhoneValidation } from '../util/contactValidation';

function businessInfoValidationResponse(errors: ValidationError[]) {
    if (errors.some(error => error.property === 'description' && error.constraints?.maxLength)) {
        return { code: 'BUSINESS_DESCRIPTION_TOO_LONG', message: BUSINESS_DESCRIPTION_TOO_LONG };
    }
    const contactErrors = [
        { field: 'whatsappNumber', code: 'BUSINESS_WHATSAPP_INVALID', message: BUSINESS_WHATSAPP_ERROR },
        { field: 'instagramAccount', code: 'BUSINESS_INSTAGRAM_INVALID', message: BUSINESS_INSTAGRAM_ERROR },
        { field: 'businessEmail', code: 'BUSINESS_EMAIL_INVALID', message: BUSINESS_EMAIL_ERROR },
    ];
    const contactError = contactErrors.find(contact => errors.some(error => error.property === contact.field));
    if (contactError) {
        const value = errors.find(error => error.property === contactError.field)?.value;
        const detail = contactError.field === 'instagramAccount' ? getInstagramAccountError(value)
            : contactError.field === 'whatsappNumber' ? getContactPhoneValidation(value) : getContactEmailValidation(value);
        return { ...contactError, ...detail };
    }
    return contactError ?? { errors };
}

export class BusinessInfoController {
    public constructor(private businessInfoService: BusinessInfoService) {}

    public async register(req: AuthRequest, res: Response) {
        try {
            const businessInfoCreateDTO = plainToInstance(BusinessInfoCreateDTO, req.body);
            const errors = await validate(businessInfoCreateDTO);

            if (errors.length > 0) {
                return res.status(400).json(businessInfoValidationResponse(errors));
            }

            await this.businessInfoService.register(businessInfoCreateDTO);
            return res.status(201).json({ message: 'Business info registered successfully' })
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async getInfo(req: AuthRequest, res: Response) {
        try {
            const businessInfo = await this.businessInfoService.getInfo();
            if (!businessInfo) {
                return res.status(200).json({ businessInfo: null });
            }

            return res.status(200).json({
                businessInfo: {
                    id: businessInfo.id,
                    instagramAccount: businessInfo.instagramAccount,
                    whatsappNumber: businessInfo.whatsappNumber,
                    businessEmail: businessInfo.businessEmail,
                    businessHours: businessInfo.businessHours,
                    description: businessInfo.description,
                    updatedAt: businessInfo.updatedAt,
                },
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async update(req: AuthRequest, res: Response) {
        try {
            const businessInfoUpdateDTO = plainToInstance(BusinessInfoUpdateDTO, req.body);
            const errors = await validate(businessInfoUpdateDTO);
            if (errors.length > 0) {
                return res.status(400).json(businessInfoValidationResponse(errors));
            }

            await this.businessInfoService.update(businessInfoUpdateDTO);
            return res.status(200).json({ message: 'Business info updated successfully' })
        } catch (error: any) {
            if (error.message.includes('Business info not found')) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    public async delete(req: AuthRequest, res: Response) {
        try {
            await this.businessInfoService.delete();
            return res.status(200).json({ message: 'Business info deleted successfully' });
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }
}
