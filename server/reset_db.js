const db = require('./db');

async function resetDatabase() {
    console.log('⚠️ WARNING: This will DELETE ALL DATA in the users, jobs, and applications tables to ensure a perfect schema match.');
    console.log('Starting reset in 3 seconds...');

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        console.log('--- Database Reset Started ---');

        // 1. Drop existing tables in reverse order of dependencies
        await db.query('DROP TABLE IF EXISTS ges_schema.job_search_logs CASCADE');
        await db.query('DROP TABLE IF EXISTS ges_schema.applications CASCADE');
        await db.query('DROP TABLE IF EXISTS ges_schema.saved_jobs CASCADE');
        await db.query('DROP TABLE IF EXISTS ges_schema.users CASCADE');
        console.log('✔ Dropped old tables.');

        // 2. Create Schema
        await db.query('CREATE SCHEMA IF NOT EXISTS ges_schema');

        // 3. Create Users Table with ALL required columns
        await db.query(`
            CREATE TABLE ges_schema.users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(20),
                dob DATE,
                country_code VARCHAR(10),
                purpose VARCHAR(100),
                target_country VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✔ Created users table with correct columns.');

        // 4. Create Saved Jobs Table
        await db.query(`
            CREATE TABLE ges_schema.saved_jobs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                job_id VARCHAR(100) NOT NULL,
                saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, job_id)
            )
        `);
        console.log('✔ Created saved_jobs table.');

        // 5. Create Applications Table
        await db.query(`
            CREATE TABLE ges_schema.applications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                job_id VARCHAR(100) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✔ Created applications table.');

        // 6. Create Job Search Logs Table
        await db.query(`
            CREATE TABLE ges_schema.job_search_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE SET NULL,
                search_query TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✔ Created job_search_logs table.');

        console.log('--- Database Fully Reset & Correct Columns Applied ---');
    } catch (err) {
        console.error('CRITICAL: Database Reset Failed:', err.message);
    } finally {
        process.exit();
    }
}

resetDatabase();
