const db = require('./db');

async function fixTable() {
    try {
        console.log("Checking and updating users table...");
        await db.query(`
            ALTER TABLE ges_schema.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
            ALTER TABLE ges_schema.users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);
            ALTER TABLE ges_schema.users ALTER COLUMN password_hash DROP NOT NULL;
        `);
        console.log("Table updated successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error updating table:", err);
        process.exit(1);
    }
}

fixTable();
