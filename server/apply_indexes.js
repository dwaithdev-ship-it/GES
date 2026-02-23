const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
});

const applyIndexes = async () => {
    const queries = [
        'CREATE INDEX IF NOT EXISTS idx_user_education_user_id ON ges_schema.user_education(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_work_experience_user_id ON ges_schema.user_work_experience(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON ges_schema.user_skills(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_tests_user_id ON ges_schema.user_tests(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_languages_user_id ON ges_schema.user_languages(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_visa_history_user_id ON ges_schema.user_visa_history(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON ges_schema.saved_jobs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_applications_user_id ON ges_schema.applications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_job_search_logs_user_id ON ges_schema.job_search_logs(user_id)'
    ];

    try {
        console.log('Applying indexes...');
        for (const query of queries) {
            await pool.query(query);
            console.log(`Executed: ${query.substring(0, 50)}...`);
        }
        console.log('All indexes applied successfully.');
    } catch (err) {
        console.error('Error applying indexes:', err);
    } finally {
        await pool.end();
    }
};

applyIndexes();
