import { BusinessInfoDAO, BusinessInfoUpdateData } from "../dao/businessInfo.dao";
import { BusinessInfoCreateDTO, BusinessInfoUpdateDTO } from "../dto/businessInfo.dto";
import { BusinessInfo } from "../model/businessInfo";
import { ActionError } from '../model/actionError';


export class BusinessInfoService {
    public constructor(private businessInfoDAO: BusinessInfoDAO) {}

    public async register(businessInfoCreateDTO: BusinessInfoCreateDTO): Promise<void> {
        const existing = await this.businessInfoDAO.searchFirst();
        if (existing) {
            throw new ActionError(409, 'BUSINESS_INFO_EXISTS', 'Business info already exists');
        }

        const businessInfo = BusinessInfo.construct(businessInfoCreateDTO);
        await this.businessInfoDAO.register(businessInfo)
    }

    public async getInfo(): Promise<BusinessInfo | null> {
        const businessInfo = await this.businessInfoDAO.searchFirst();
        return businessInfo ? BusinessInfo.reconstruct(businessInfo) : null;
    }

    public async update(businessInfoUpdateDTO: BusinessInfoUpdateDTO): Promise <void> {
        const businessInfo = await this.businessInfoDAO.searchFirst();
        if (!businessInfo) {
            throw new ActionError(404, 'BUSINESS_INFO_NOT_FOUND', 'Business info not found');
        }

        const data: BusinessInfoUpdateData = {...businessInfoUpdateDTO}
        await this.businessInfoDAO.update(businessInfo.id, data)
    }

    public async delete(): Promise<void> {
        const businessInfo = await this.businessInfoDAO.searchFirst();
        if (!businessInfo) {
            throw new ActionError(404, 'BUSINESS_INFO_NOT_FOUND', 'Business info not found');
        }

        await this.businessInfoDAO.delete(businessInfo.id);
    }
}
