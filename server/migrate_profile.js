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

        // Enforce single entry for profile sections if user wants "replacement"
        // We'll add a unique constraint on user_id for these tables to allow upsert logic
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
                // Drop existing unique constraint if any (to avoid duplicates if we re-run)
                await pool.query(`ALTER TABLE ges_schema.${table} DROP CONSTRAINT IF EXISTS unique_user_${table}`);
                // Add unique constraint on user_id
                await pool.query(`ALTER TABLE ges_schema.${table} ADD CONSTRAINT unique_user_${table} UNIQUE (user_id)`);
                console.log(`Unique constraint added to ${table}`);
            } catch (err) {
                console.warn(`Could not add unique constraint to ${table}:`, err.message);
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
