const db = require('./db');

(async () => {
    try {
        const tables = ['user_education', 'user_work_experience', 'user_skills', 'user_tests', 'user_languages', 'user_visa_history'];
        console.log("=== CHECKING PROFILE TABLES ===");
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const columns = await db.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = $1 ORDER BY ordinal_position`, [table]);
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
