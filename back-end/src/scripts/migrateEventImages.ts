import { connection } from '../util/connection';
import { getCloudinaryConfig } from '../service/imageStorage.service';
import { migrateEventImages, type ImageMigrationRepository } from '../service/imageMigration.service';

export const imageMigrationRepository: ImageMigrationRepository = {
    async listUrls() {
        const [rows] = await connection.query<any[]>(
            `SELECT bannerImage AS url FROM events WHERE bannerImage IS NOT NULL
             UNION SELECT imageUrl AS url FROM images`,
        );
        return rows.map(row => row.url);
    },
    async replaceUrl(previous, next) {
        const db = await connection.getConnection();
        try {
            await db.beginTransaction();
            await db.query('UPDATE events SET bannerImage = ? WHERE bannerImage = ?', [next, previous]);
            await db.query('UPDATE images SET imageUrl = ? WHERE imageUrl = ?', [next, previous]);
            await db.commit();
        } catch (error) {
            await db.rollback();
            throw error;
        } finally {
            db.release();
        }
    },
};

async function main() {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--apply', '--help'].includes(arg))) {
        throw new Error('Use npm run images:migrate:cloudinary [-- --apply]. Sem --apply, apenas conta as fotos pendentes.');
    }
    if (args.includes('--help')) {
        console.log('npm run images:migrate:cloudinary: consulta as fotos pendentes, sem alterações.');
        console.log('npm run images:migrate:cloudinary -- --apply: copia as fotos e atualiza os links no MySQL. Os Blobs originais são preservados.');
        return;
    }
    const apply = args.includes('--apply');
    if (apply) getCloudinaryConfig();
    const report = await migrateEventImages(imageMigrationRepository, {
        apply,
        onResult: (pathname, error) => console.log(`${error ? 'ERRO' : 'OK'} ${pathname}${error ? ': ' + error : ''}`),
    });
    console.log(`${apply ? 'Migração' : 'Simulação'}: ${report.found} fotos Blob, ${report.migrated} migradas, ${report.failed} falhas, ${report.skipped} outras URLs.`);
    if (!apply) console.log('Para aplicar, execute novamente com -- --apply após configurar o Cloudinary.');
    if (report.failed) process.exitCode = 1;
}

if (require.main === module) {
    main().catch(() => {
        console.error('Migração não concluída. Verifique as credenciais Cloudinary/Blob e a conexão MySQL no backend.');
        process.exitCode = 1;
    }).finally(() => connection.end());
}
