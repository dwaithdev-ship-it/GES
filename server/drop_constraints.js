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

async function dropConstraints() {
    const tables = [
        'user_education',
        'user_work_experience',
        'user_skills',
        'user_tests',
        'user_languages',
        'user_visa_history'
    ];

    try {
        console.log('Dropping unique constraints on user_id to allow multiple entries...');
        for (const table of tables) {
            try {
                // Drop existing unique constraint
                await pool.query(`ALTER TABLE ges_schema.${table} DROP CONSTRAINT IF EXISTS unique_user_${table}`);
                console.log(`Dropped constraint unique_user_${table} from ${table}`);
            } catch (err) {
                console.warn(`Could not drop constraint from ${table}:`, err.message);
            }
        }
        console.log('Constraints dropped successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

dropConstraints();
