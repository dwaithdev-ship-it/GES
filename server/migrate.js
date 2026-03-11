const admin = require('firebase-admin');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 1. Initialize Firebase Admin
// TODO: You must download your Service Account Key from Firebase Console:
// Project Settings > Service Accounts > Generate New Private Key
// Save it as 'serviceAccount.json' in this directory.
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

// 2. Initialize PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function migrateUsers() {
    console.log('Starting migration...');
    const usersSnapshot = await firestore.collection('users').get();

    if (usersSnapshot.empty) {
        console.log('No users found in Firestore.');
        return;
    }

    console.log(`Found ${usersSnapshot.size} users. Migrating...`);

    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        const email = data.email;
        // Firebase Auth passwords aren't in Firestore. 
        // We set a placeholder or temporary password that needs resetting.
        const placeholderPassword = '$2b$10$temporary_hashed_password_placeholder';

        try {
            await pool.query(
                `INSERT INTO ges_schema.users 
                (email, password_hash, first_name, last_name, phone, dob, country_code, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (email) DO NOTHING`,
                [
                    email,
                    placeholderPassword,
                    data.firstName || null,
                    data.lastName || null,
                    data.phone || null,
                    data.dob || null,
                    data.countryCode || null,
                    data.createdAt ? data.createdAt.toDate() : new Date()
                ]
            );
            console.log(`Migrated: ${email}`);
        } catch (err) {
            console.error(`Error migrating user ${email}:`, err.message);
        }
    }
    console.log('Users migration completed.');
}

migrateUsers().then(() => {
    console.log('All migrations finished.');
    process.exit();
}).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
