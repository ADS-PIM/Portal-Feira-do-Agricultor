import { createHash } from 'node:crypto';
import { AdminDAO } from '../dao/admin.dao';
import { getCloudinaryConfig, ImageStorageService, loadCloudinarySdk } from './imageStorage.service';

export async function deleteOwnedProfileImage(owner: string, url: string): Promise<void> {
    const config = getCloudinaryConfig();
    const prefix = `https://res.cloudinary.com/${config.cloud_name}/image/upload/`;
    const folder = `profile-images/${createHash('sha256').update(owner).digest('hex')}/`;
    // Never delete arbitrary URLs, event photos, or another account's assets.
    if (!url.startsWith(prefix)) return;
    const path = url.slice(prefix.length).replace(/^v\d+\//, '');
    if (!path.startsWith(folder) || !/^[0-9a-f-]{36}\.webp$/.test(path.slice(folder.length))) return;
    const result = await loadCloudinarySdk().uploader.destroy(path.replace(/\.webp$/, ''), {
        ...config, resource_type: 'image', type: 'upload', invalidate: true,
    });
    if (!['ok', 'not found'].includes(result.result)) throw new Error('Image deletion failed');
}

export class ProfilePictureService {
    constructor(
        private readonly dao: Pick<AdminDAO, 'replaceProfilePicture'> = new AdminDAO(),
        private readonly storage = new ImageStorageService(),
        private readonly remove = deleteOwnedProfileImage,
    ) {}

    async clear(owner: string) {
        const previous = await this.dao.replaceProfilePicture(owner, null);
        const cleanupPending = await this.cleanup(owner, previous);
        return { profile_picture: null, cleanupPending };
    }

    private async cleanup(owner: string, previous: string | null): Promise<boolean> {
        if (!previous) return false;
        try {
            await this.remove(owner, previous);
            return false;
        } catch {
            console.error('Failed to delete previous profile image.');
            return true;
        }
    }

    async replace(owner: string, image: unknown, contentType?: string) {
        const { url } = await this.storage.upload(image, contentType, undefined, owner);
        let previous: string | null;
        try {
            previous = await this.dao.replaceProfilePicture(owner, url);
        } catch (error) {
            // A failed database update leaves the previous reference untouched.
            await this.remove(owner, url).catch(() => console.error('Failed to clean up unlinked profile image.'));
            throw error;
        }
        const cleanupPending = previous !== url && await this.cleanup(owner, previous);
        // A cleanup failure must never roll back an already committed replacement.
        return { profile_picture: url, cleanupPending };
    }
}
