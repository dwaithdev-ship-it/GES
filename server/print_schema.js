const db = require('./db');

(async () => {
    try {
        const tables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'ges_schema'`);
        console.log("=== DATABASE STRUCTURE (Schema: ges_schema) ===");
        for (const row of tables.rows) {
            console.log(`\nTable: ${row.table_name}`);
            const columns = await db.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = $1 ORDER BY ordinal_position`, [row.table_name]);
            columns.rows.forEach(col => {
                const type = col.data_type;
                const nullable = col.is_nullable === 'YES' ? '(Optional)' : '(Required)';
                console.log(`  - ${col.column_name.padEnd(20)} ${type.padEnd(20)} ${nullable}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
