// Data migration script for GES
// Usage:
//   node migrate_data.js            # dry-run (no writes)
//   node migrate_data.js --apply    # perform updates
// The script loads DB connection from server/.env via dotenv

const { Pool } = require('pg');
const path = require('path');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function normalizePhones(client) {
  console.log('Checking phone formats in ges_schema.users...');
  const res = await client.query('SELECT id, phone, country_code FROM ges_schema.users');
  const ops = [];
  for (const row of res.rows) {
    if (!row.phone) continue;
    const digits = (row.phone || '').replace(/\D/g, '');
    if (!digits) continue;
    let phone = digits;
    let country_code = row.country_code || process.env.DEFAULT_COUNTRY_CODE || '91';
    if (digits.length > 10) {
      country_code = digits.slice(0, digits.length - 10);
      phone = digits.slice(-10);
    }
    if (phone !== (row.phone || '').replace(/\D/g, '').slice(-10) || country_code !== (row.country_code || '')) {
      ops.push({ id: row.id, phone, country_code });
    }
  }

  console.log(`Found ${ops.length} phone(s) to update.`);
  if (!APPLY) return;

  for (const o of ops) {
    await client.query('UPDATE ges_schema.users SET phone = $1, country_code = $2, updated_at = NOW() WHERE id = $3', [o.phone, o.country_code, o.id]);
  }
  console.log('Phone normalization applied.');
}

async function lowercaseEmails(client) {
  console.log('Checking email casing...');
  const res = await client.query("SELECT id, email FROM ges_schema.users WHERE email IS NOT NULL");
  const ops = [];
  for (const row of res.rows) {
    const lower = row.email.toLowerCase();
    if (row.email !== lower) ops.push({ id: row.id, email: lower });
  }
  console.log(`Found ${ops.length} email(s) to lowercase.`);
  if (!APPLY) return;
  for (const o of ops) {
    await client.query('UPDATE ges_schema.users SET email = $1, updated_at = NOW() WHERE id = $2', [o.email, o.id]);
  }
  console.log('Email lowercasing applied.');
}

async function ensureTimestamps(client) {
  console.log('Ensuring created_at/updated_at presence...');
  const res = await client.query("SELECT id, created_at, updated_at FROM ges_schema.users WHERE created_at IS NULL OR updated_at IS NULL");
  console.log(`Found ${res.rows.length} user(s) missing timestamps.`);
  if (!APPLY) return;
  for (const row of res.rows) {
    await client.query('UPDATE ges_schema.users SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW()) WHERE id = $1', [row.id]);
  }
  console.log('Timestamps fixed.');
}

async function dedupeUsersByEmail(client) {
  console.log('Looking for duplicate emails...');
  const res = await client.query(`
    SELECT email, array_agg(id) as ids, count(*) as cnt
    FROM ges_schema.users
    WHERE email IS NOT NULL
    GROUP BY email HAVING count(*) > 1
  `);
  console.log(`Found ${res.rows.length} duplicate-email group(s).`);
  for (const row of res.rows) {
    console.log(`Email ${row.email} => IDs: ${row.ids.join(', ')}`);
  }
  // This script will only report duplicates — manual resolution recommended.
}

async function migrateResumeNames(client) {
  console.log('Checking resume_name values...');
  const res = await client.query("SELECT id, resume_name FROM ges_schema.users WHERE resume_name IS NOT NULL AND resume_name <> ''");
  console.log(`Found ${res.rows.length} users with resume_name.`);
  // For safety, only report. If you want to move resumes to a files table, implement here.
}

async function runAll() {
  const client = await pool.connect();
  try {
    console.log(APPLY ? 'Running migration in APPLY mode' : 'Running migration in DRY-RUN mode (no writes)');
    await client.query('BEGIN');
    await normalizePhones(client);
    await lowercaseEmails(client);
    await ensureTimestamps(client);
    await dedupeUsersByEmail(client);
    await migrateResumeNames(client);
    if (APPLY) {
      await client.query('COMMIT');
      console.log('All changes committed.');
    } else {
      await client.query('ROLLBACK');
      console.log('Dry-run complete; no changes were committed. Re-run with --apply to apply changes.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runAll().catch(err => { console.error(err); process.exit(1); });
