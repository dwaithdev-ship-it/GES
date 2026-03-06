const db = require('./db');

(async function() {
  try {
    const schemaRes = await db.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name='ges_schema'");
    console.log('ges_schema exists rows:', schemaRes.rows.length);

    const tableRes = await db.query("SELECT to_regclass('ges_schema.users') AS reg");
    console.log('ges_schema.users reg:', tableRes.rows[0].reg);

    // List tables in ges_schema
    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='ges_schema'");
    console.log('tables in ges_schema:', tables.rows.map(r=>r.table_name));

    await db.pool.end();
  } catch (err) {
    console.error('Error checking DB:', err);
    try { await db.pool.end(); } catch(e){}
    process.exit(1);
  }
})();
