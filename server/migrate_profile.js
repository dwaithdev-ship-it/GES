const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    try {
        console.log('Running migration...');

        // Add photo columns
        await pool.query(`
            ALTER TABLE ges_schema.users 
            ADD COLUMN IF NOT EXISTS photo_content TEXT,
            ADD COLUMN IF NOT EXISTS photo_type VARCHAR(50);
        `);
        console.log('Photo columns added successfully.');

        const tables = [
            'user_education',
            'user_work_experience',
            'user_skills',
            'user_tests',
            'user_languages',
            'user_visa_history'
        ];

        for (const table of tables) {
            try {
                await pool.query(`
                    ALTER TABLE ges_schema.${table}
                    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                `);

                const constraints = await pool.query(
                    `SELECT con.conname
                     FROM pg_constraint con
                     JOIN pg_class rel ON rel.oid = con.conrelid
                     JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                     WHERE nsp.nspname = 'ges_schema'
                       AND rel.relname = $1
                       AND con.contype = 'u'
                       AND array_length(con.conkey, 1) = 1
                       AND EXISTS (
                           SELECT 1
                           FROM pg_attribute att
                           WHERE att.attrelid = rel.oid
                             AND att.attnum = con.conkey[1]
                             AND att.attname = 'user_id'
                       )`,
                    [table]
                );

                for (const { conname } of constraints.rows) {
                    await pool.query(`ALTER TABLE ges_schema.${table} DROP CONSTRAINT IF EXISTS ${conname}`);
                }

                console.log(`Profile table normalized: ${table}`);
            } catch (err) {
                console.warn(`Could not normalize ${table}:`, err.message);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
