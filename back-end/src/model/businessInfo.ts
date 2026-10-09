import { BusinessInfoCreateDTO } from '../dto/businessInfo.dto';

export type propsBusinessInfo = {
    id: string;
    instagramAccount: string | null;
    whatsappNumber: string | null;
    businessEmail: string | null;
    businessHours: string;
    description: string | null;
    updatedAt: Date;
}

export class BusinessInfo {
    constructor(private props: propsBusinessInfo) {}

    public static construct(businessInfoCreateDTO: BusinessInfoCreateDTO){
        const props: propsBusinessInfo = {
            id: crypto.randomUUID(),
            instagramAccount: businessInfoCreateDTO.instagramAccount,
            whatsappNumber: businessInfoCreateDTO.whatsappNumber,
            businessEmail: businessInfoCreateDTO.businessEmail,
            businessHours: businessInfoCreateDTO.businessHours,
            description: businessInfoCreateDTO.description ?? null,
            updatedAt: new Date()
        }
        return new BusinessInfo(props)
    }

    public static reconstruct(props: propsBusinessInfo) {
        return new BusinessInfo(props)
    }

    public get id () {
        return this.props.id;
    }

    public get instagramAccount () {
        return this.props.instagramAccount;
    }

    public get whatsappNumber () {
        return this.props.whatsappNumber;
    }

    public get businessEmail () {
        return this.props.businessEmail;
    }

    public get businessHours () {
        return this.props.businessHours;
    }

    public get description () {
        return this.props.description;
    }

    public get updatedAt () {
        return this.props.updatedAt;
    }
}

