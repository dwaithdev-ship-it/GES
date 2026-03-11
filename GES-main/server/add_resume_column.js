const db = require('./db');

(async function() {
  try {
    await db.query("ALTER TABLE ges_schema.users ADD COLUMN IF NOT EXISTS resume_name VARCHAR(255);");
    console.log('resume_name column ensured');
    await db.pool.end();
  } catch (err) {
    console.error('Error adding resume_name column:', err.message || err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
})();
