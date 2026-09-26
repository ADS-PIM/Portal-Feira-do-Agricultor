import { BusinessInfoDAO, BusinessInfoUpdateData } from "../dao/businessInfo.dao";
import { BusinessInfoCreateDTO, BusinessInfoUpdateDTO } from "../dto/businessInfo.dto";
import { BusinessInfo } from "../model/businessInfo";


export class BusinessInfoService {
    public constructor(private businessInfoDAO: BusinessInfoDAO) {}

    public async register(businessInfoCreateDTO: BusinessInfoCreateDTO): Promise<void> {
        try {
            const existing = await this.businessInfoDAO.searchFirst();
            if (existing) {
                throw new Error('Business info already exists');
            }

            const businessInfo = BusinessInfo.construct(businessInfoCreateDTO);
            await this.businessInfoDAO.register(businessInfo)
        } catch (error: any) {
            throw new Error('Error registering business info: ' + error.message)
        }
    }

    public async getInfo(): Promise<BusinessInfo | null> {
        return this.businessInfoDAO.searchFirst();
    }

    public async update(businessInfoUpdateDTO: BusinessInfoUpdateDTO): Promise <void> {
        const businessInfo = await this.businessInfoDAO.searchFirst();
        if (!businessInfo) {
            throw new Error('Business info not found');
        }

        const data: BusinessInfoUpdateData = {...businessInfoUpdateDTO}
        await this.businessInfoDAO.update(businessInfo.id, data)
    }

    public async delete(): Promise<void> {
        const businessInfo = await this.businessInfoDAO.searchFirst();
        if (!businessInfo) {
            throw new Error('Business info not found');
        }
 
        await this.businessInfoDAO.delete(businessInfo.id);
    }
}