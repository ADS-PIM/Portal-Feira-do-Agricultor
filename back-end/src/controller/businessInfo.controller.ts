import { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BusinessInfoCreateDTO, BusinessInfoUpdateDTO } from '../dto/businessInfo.dto';
import { BusinessInfoService } from '../service/businessInfo.service';
import { AuthRequest } from '../../authMiddleware';


export class BusinessInfoController {
    public constructor(private businessInfoService: BusinessInfoService) {}

    public async register(req: AuthRequest, res: Response) {
        try {
            const businessInfoCreateDTO = plainToInstance(BusinessInfoCreateDTO, req.body);
            const errors = await validate(businessInfoCreateDTO);

            if (errors.length > 0) {
                return res.status(400).json
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
                return res.status(400).json({ errors })
            }

            await this.businessInfoService.update(businessInfoUpdateDTO);
            return res.status(200).json({ message: 'Business info updated successfully' })
        } catch (error: any) {
            if (error.message.includes === 'Business info not found') {
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