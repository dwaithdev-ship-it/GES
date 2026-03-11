const db = require('./db');

async function fixDatabaseStructure() {
    console.log('--- Database Repair Started ---');
    try {
        // 1. Ensure Schema
        await db.query('CREATE SCHEMA IF NOT EXISTS ges_schema');
        console.log('✔ Schema ges_schema checked.');

        // 2. Comprehensive Users Table Alignment
        const columns = [
            { name: 'email', type: 'VARCHAR(255) UNIQUE' },
            { name: 'password_hash', type: 'TEXT' },
            { name: 'first_name', type: 'VARCHAR(100)' },
            { name: 'last_name', type: 'VARCHAR(100)' },
            { name: 'phone', type: 'VARCHAR(20)' },
            { name: 'dob', type: 'DATE' },
            { name: 'country_code', type: 'VARCHAR(10)' },
            { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
        ];

        // Ensure table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS ges_schema.users (
                id SERIAL PRIMARY KEY
            )
        `);

        for (const col of columns) {
            try {
                // We use a safe ALTER TABLE that only adds if missing
                await db.query(`ALTER TABLE ges_schema.users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`✔ Column ${col.name} is ready.`);
            } catch (err) {
                console.error(`✘ Error ensuring column ${col.name}:`, err.message);
            }
        }

        // Handle common renames (camelCase to snake_case)
        const renames = [
            { old: 'firstName', new: 'first_name' },
            { old: 'lastName', new: 'last_name' },
            { old: 'countryCode', new: 'country_code' },
            { old: 'country code', new: 'country_code' }
        ];

        for (const rename of renames) {
            try {
                // Check if old exists AND new doesn't
                const checkOld = await db.query(`
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = $1
                `, [rename.old]);

                const checkNew = await db.query(`
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = $1
                `, [rename.new]);

                if (checkOld.rows.length > 0 && checkNew.rows.length === 0) {
                    await db.query(`ALTER TABLE ges_schema.users RENAME COLUMN "${rename.old}" TO ${rename.new}`);
                    console.log(`✔ Renamed old column ${rename.old} to ${rename.new}.`);
                }
            } catch (err) {
                // Ignore if column doesn't exist
            }
        }

        console.log('--- Database Repair Completed Successfully ---');
    } catch (err) {
        console.error('CRITICAL: Database Repair Failed:', err.message);
    } finally {
        process.exit();
    }
}

fixDatabaseStructure();
