const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false
});

async function setupSchema() {
    console.log('Applying schema...');
    try {
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schemaSql);
        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Error applying schema:', err.message);
    } finally {
        await pool.end();
    }
}

setupSchema();
