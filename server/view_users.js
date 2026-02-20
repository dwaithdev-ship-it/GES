const path = require('path');
const { Pool } = require('pg');

/**
 * Always load .env from THIS folder (server/)
 * This prevents errors when running from root directory.
 */
require('dotenv').config({
    path: path.resolve(__dirname, '.env')
});

/**
 * Create PostgreSQL connection pool
 */
const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT), // ensure number
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * View registered users
 */
async function viewUsers() {
    try {
        console.log("Connecting to DB:", {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        });

        const query = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        dob,
        country_code,
        google_id,
        facebook_id,
        created_at
      FROM ges_schema.users
      ORDER BY created_at DESC
      LIMIT 100;
    `;

        const res = await pool.query(query);

        console.log("\n--- REGISTERED USERS ---\n");

        if (res.rows.length === 0) {
            console.log("No users found in the database.");
        } else {
            console.table(res.rows);
        }

        console.log("\n---------------------------------------\n");

    } catch (err) {
        console.error("Error fetching users:", err.message);
    } finally {
        await pool.end();
    }
}

/**
 * Execute
 */
viewUsers();