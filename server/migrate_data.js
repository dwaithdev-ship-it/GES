// Simple data-migration script skeleton for GES
// Usage: node migrate_data.js
// It loads DB connection from server/.env (via dotenv) and runs transformations.

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function normalizePhones() {
  console.log('Normalizing phone numbers in ges_schema.users...');
  const client = await pool.connect();
  try {
    // Example: strip non-digits and ensure country code is stored in country_code
    const res = await client.query('SELECT id, phone FROM ges_schema.users');
    for (const row of res.rows) {
      if (!row.phone) continue;
      const digits = row.phone.replace(/\D/g, '');
      let phone = digits;
      let country_code = process.env.DEFAULT_COUNTRY_CODE || '91';
      if (digits.length > 10) {
        // assume leading country code
        country_code = digits.slice(0, digits.length - 10);
        phone = digits.slice(-10);
      }
      await client.query('UPDATE ges_schema.users SET phone = $1, country_code = $2 WHERE id = $3', [phone, country_code, row.id]);
    }
    console.log('Phone normalization completed.');
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await normalizePhones();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
