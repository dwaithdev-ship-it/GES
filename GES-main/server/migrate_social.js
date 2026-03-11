const db = require('./db');

async function migrate() {
    try {
        console.log("Starting social login migration...");
        await db.query(`
            ALTER TABLE ges_schema.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
            ALTER TABLE ges_schema.users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);
            ALTER TABLE ges_schema.users ALTER COLUMN password_hash DROP NOT NULL;
        `);
        console.log("Migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err.message);
        process.exit(1);
    }
}

migrate();
