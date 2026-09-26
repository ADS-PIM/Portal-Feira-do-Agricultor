import { connection } from '../util/connection';
import { BusinessInfo } from '../model/businessInfo';

export type BusinessInfoUpdateData = {
    instagramAccount?: string;
    whatsappNumber?: string;
    businessEmail?: string;
    businessHours?: string;
};

export class BusinessInfoDAO {
    public async register(businessInfo: BusinessInfo): Promise<void> {
        try {
            await connection.query('INSERT INTO businessInfo (id, instagramAccount, whatsappNumber, businessEmail, businessHours, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [
                businessInfo.id,
                businessInfo.instagramAccount,
                businessInfo.whatsappNumber,
                businessInfo.businessEmail,
                businessInfo.businessHours,
                businessInfo.updatedAt
            ]);
        } catch (error: any) {
            throw new Error('Error registering business info: ' + error.message)
        }
    }

    public async searchById(id: string): Promise<BusinessInfo | null> {
        try {
            const [rows]: any = await connection.query('SELECT * FROM businessInfo where id = ?', [id])
            if (!rows || rows.length === 0) {
                return null;
            }
            return BusinessInfo.reconstruct(rows[0]);
        } catch (error: any) {
            throw new Error('Error searching business info by id: ' + error.message)
        }
    }

    public async searchFirst(): Promise<BusinessInfo | null> {
        try {
            const [rows]: any = await connection.query(
                'SELECT * FROM businessInfo LIMIT 1'
            );
 
            if (!rows || rows.length === 0) {
                return null;
            }
 
            return BusinessInfo.reconstruct(rows[0]);
        } catch (error: any) {
            throw new Error('Error searching business info: ' + error.message);
        }
    }


    public async update(id: string, data: BusinessInfoUpdateData): Promise<void> {
        const fields: string[] = []
        const values: any[] = []

        if (data.instagramAccount !== undefined) {
            fields.push('instagramAccount = ?'); values.push(data.instagramAccount)
        };

        if (data.whatsappNumber !== undefined) {
            fields.push('whatsappNumber = ?'); values.push(data.whatsappNumber)
        };

        if (data.businessEmail !== undefined) {
            fields.push('businessEmail = ?'); values.push(data.businessEmail)
        };

        if (data.businessHours !== undefined) {
            fields.push('businessHours = ?'); values.push(data.businessHours)
        };

        if (fields.length === 0) {
            return;
        }

        fields.push('updatedAt = ?');
        values.push(new Date());

        try {
            await connection.query(`UPDATE businessInfo  SET ${fields.join(', ')} WHERE id = ?`,[...values, id]);
        } catch (error: any) {
            throw new Error('Error updating business info : ' + error.message)
        }
    }


    public async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM businessInfo WHERE id = ?', [id]);
        } catch (error: any) {
            throw new Error('Error deleting business info: ' + error.message);
        }
    }
}
