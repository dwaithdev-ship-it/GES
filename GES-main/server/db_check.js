const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkTable() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'ges_schema' AND table_name = 'users'
            ORDER BY ordinal_position;
        `);
        console.log("Columns in ges_schema.users:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });

        const users = await pool.query('SELECT * FROM ges_schema.users LIMIT 5;');
        console.log("\nSample User Data (Last 5):");
        console.table(users.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTable();
