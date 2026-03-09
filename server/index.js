require('dotenv').config(); // MUST be first before any other imports
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 5000;
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;

const profileTableDefinitions = {
    user_education: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.user_education (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                institution VARCHAR(255),
                study_field VARCHAR(255),
                edu_level VARCHAR(50),
                degree VARCHAR(255),
                location VARCHAR(100),
                is_highest BOOLEAN DEFAULT FALSE,
                start_month VARCHAR(20),
                start_year VARCHAR(10),
                end_month VARCHAR(20),
                end_year VARCHAR(10),
                course_type VARCHAR(100),
                study_mode VARCHAR(100),
                medium VARCHAR(100),
                division VARCHAR(100),
                score_type VARCHAR(20),
                score_value VARCHAR(20),
                info TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            institution: 'VARCHAR(255)',
            study_field: 'VARCHAR(255)',
            edu_level: 'VARCHAR(50)',
            degree: 'VARCHAR(255)',
            location: 'VARCHAR(100)',
            is_highest: 'BOOLEAN DEFAULT FALSE',
            start_month: 'VARCHAR(20)',
            start_year: 'VARCHAR(10)',
            end_month: 'VARCHAR(20)',
            end_year: 'VARCHAR(10)',
            course_type: 'VARCHAR(100)',
            study_mode: 'VARCHAR(100)',
            medium: 'VARCHAR(100)',
            division: 'VARCHAR(100)',
            score_type: 'VARCHAR(20)',
            score_value: 'VARCHAR(20)',
            info: 'TEXT',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    user_work_experience: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.user_work_experience (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                company VARCHAR(255),
                domain VARCHAR(255),
                role VARCHAR(255),
                location VARCHAR(100),
                is_current BOOLEAN DEFAULT FALSE,
                start_month VARCHAR(20),
                start_year VARCHAR(10),
                end_month VARCHAR(20),
                end_year VARCHAR(10),
                employment_type VARCHAR(100),
                industry VARCHAR(100),
                responsibilities TEXT,
                achievements TEXT,
                info TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            company: 'VARCHAR(255)',
            domain: 'VARCHAR(255)',
            role: 'VARCHAR(255)',
            location: 'VARCHAR(100)',
            is_current: 'BOOLEAN DEFAULT FALSE',
            start_month: 'VARCHAR(20)',
            start_year: 'VARCHAR(10)',
            end_month: 'VARCHAR(20)',
            end_year: 'VARCHAR(10)',
            employment_type: 'VARCHAR(100)',
            industry: 'VARCHAR(100)',
            responsibilities: 'TEXT',
            achievements: 'TEXT',
            info: 'TEXT',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    user_skills: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.user_skills (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                skill_name VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            skill_name: 'VARCHAR(100)',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    user_tests: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.user_tests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                test_name VARCHAR(100),
                score VARCHAR(50),
                taken_month VARCHAR(20),
                taken_year VARCHAR(10),
                valid_month VARCHAR(20),
                valid_till_month VARCHAR(20),
                valid_year VARCHAR(10),
                valid_till_year VARCHAR(10),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            test_name: 'VARCHAR(100)',
            score: 'VARCHAR(50)',
            taken_month: 'VARCHAR(20)',
            taken_year: 'VARCHAR(10)',
            valid_month: 'VARCHAR(20)',
            valid_till_month: 'VARCHAR(20)',
            valid_year: 'VARCHAR(10)',
            valid_till_year: 'VARCHAR(10)',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    user_languages: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.user_languages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                name VARCHAR(100),
                overall VARCHAR(50),
                listening VARCHAR(50),
                speaking VARCHAR(50),
                reading VARCHAR(50),
                writing VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            name: 'VARCHAR(100)',
            overall: 'VARCHAR(50)',
            listening: 'VARCHAR(50)',
            speaking: 'VARCHAR(50)',
            reading: 'VARCHAR(50)',
            writing: 'VARCHAR(50)',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    user_visa_history: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.user_visa_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                type VARCHAR(100),
                country VARCHAR(100),
                specification VARCHAR(255),
                valid_date VARCHAR(10),
                valid_month VARCHAR(20),
                valid_till_month VARCHAR(20),
                valid_year VARCHAR(10),
                valid_till_year VARCHAR(10),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            type: 'VARCHAR(100)',
            country: 'VARCHAR(100)',
            specification: 'VARCHAR(255)',
            valid_date: 'VARCHAR(10)',
            valid_month: 'VARCHAR(20)',
            valid_till_month: 'VARCHAR(20)',
            valid_year: 'VARCHAR(10)',
            valid_till_year: 'VARCHAR(10)',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
            updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    applications: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.applications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE,
                job_id VARCHAR(100) NOT NULL,
                job_title VARCHAR(255),
                company VARCHAR(255),
                location VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE CASCADE',
            job_id: 'VARCHAR(100) NOT NULL',
            job_title: 'VARCHAR(255)',
            company: 'VARCHAR(255)',
            location: 'VARCHAR(255)',
            status: "VARCHAR(50) DEFAULT 'pending'",
            applied_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    },
    job_search_logs: {
        createTableSql: `
            CREATE TABLE IF NOT EXISTS ges_schema.job_search_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ges_schema.users(id) ON DELETE SET NULL,
                search_query TEXT NOT NULL,
                location VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `,
        columns: {
            user_id: 'INTEGER REFERENCES ges_schema.users(id) ON DELETE SET NULL',
            search_query: 'TEXT NOT NULL',
            location: 'VARCHAR(255)',
            created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
        }
    }
};

const getProfileRows = async (tableName, userId) => {
    try {
        const result = await db.query(
            `SELECT * FROM ges_schema.${tableName}
             WHERE user_id = $1
             ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC`,
            [userId]
        );
        if (tableName === 'user_tests') {
            return result.rows.map((row) => ({
                ...row,
                valid_month: row.valid_month || row.valid_till_month || '',
                valid_year: row.valid_year || row.valid_till_year || ''
            }));
        }
        if (tableName === 'user_visa_history') {
            return result.rows.map((row) => ({
                ...row,
                valid_month: row.valid_month || row.valid_till_month || '',
                valid_year: row.valid_year || row.valid_till_year || ''
            }));
        }
        return result.rows;
    } catch (err) {
        console.error(`[Profile Read Error] ${tableName}: ${err.message}`);
        return [];
    }
};

const ensureProfileSchema = async () => {
    await db.query('CREATE SCHEMA IF NOT EXISTS ges_schema');

    for (const [tableName, definition] of Object.entries(profileTableDefinitions)) {
        await db.query(definition.createTableSql);

        for (const [columnName, columnDefinition] of Object.entries(definition.columns)) {
            await db.query(
                `ALTER TABLE ges_schema.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnDefinition}`
            );
        }

        const duplicateUserConstraints = await db.query(
            `SELECT con.conname
             FROM pg_constraint con
             JOIN pg_class rel ON rel.oid = con.conrelid
             JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
             WHERE nsp.nspname = 'ges_schema'
               AND rel.relname = $1
               AND con.contype = 'u'
               AND array_length(con.conkey, 1) = 1
               AND EXISTS (
                   SELECT 1
                   FROM pg_attribute att
                   WHERE att.attrelid = rel.oid
                     AND att.attnum = con.conkey[1]
                     AND att.attname = 'user_id'
               )`,
            [tableName]
        );

        for (const { conname } of duplicateUserConstraints.rows) {
            await db.query(`ALTER TABLE ges_schema.${tableName} DROP CONSTRAINT IF EXISTS ${conname}`);
        }
    }
};

// Helper to send Telegram notification
const sendTelegramNotification = async (message) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("Telegram credentials missing in .env");
        return;
    }
    try {
        console.log(`📡 Sending Telegram message to chat ${TELEGRAM_CHAT_ID}...`);
        const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        }, { timeout: 10000 });
        console.log("✅ Telegram API response:", response.status, response.statusText);
    } catch (err) {
        console.error("Telegram Error:", err.response ? err.response.data : err.message);
    }
};

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Helper to send detailed Telegram notification (FIXED)
const sendDetailedTelegram = async (userOrId, subject, additionalInfo = '') => {
    try {
        console.log("📨 Telegram Triggered for:", userOrId);

        let user;
        const userId = typeof userOrId === 'object' ? userOrId.id : userOrId;

        // Fetch ONLY existing columns (no resume_name, no dob)
        const userRes = await db.query(
            `SELECT id, email, first_name, last_name, phone, country_code 
             FROM ges_schema.users 
             WHERE id = $1`,
            [userId]
        );

        user = userRes.rows[0];

        if (!user) {
            console.log("❌ No user found for Telegram notification");
            return;
        }

        const message = `
🎉 New User Registered

👤 Name: ${user.first_name || ''} ${user.last_name || ''}
📧 Email: ${user.email || 'N/A'}
📱 Phone: ${user.country_code || ''} ${user.phone || 'N/A'}
🆔 User ID: ${user.id}
🕒 Time: ${new Date().toLocaleString()}
`;

        console.log("📤 Sending Telegram message...");
        await sendTelegramNotification(message);
        console.log("✅ Telegram message sent successfully!");

    } catch (err) {
        console.error("🚨 Detailed Telegram FULL Error:", err);
    }
};

// --- AUTHENTICATION ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, firstName, lastName, phone, dob, countryCode } = req.body;
    console.log(`[Signup Attempt] Email: ${email}, Name: ${firstName} ${lastName}, Phone: ${phone}`);
    try {
        // Check if user exists
        const userCheck = await db.query('SELECT * FROM ges_schema.users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            console.log(`[Signup Failed] User already exists: ${email}`);
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await db.query(
            `INSERT INTO ges_schema.users 
            (email, password_hash, first_name, last_name, phone, dob, country_code) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name`,
            [email, hashedPassword, firstName, lastName, phone, dob, countryCode]
        );
        const user = result.rows[0];
        console.log(`[Signup Success] User Created: ${user.email} (ID: ${user.id})`);
        console.log(`[Signup Success] User Created ID: ${user.id}`);

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        // Notify via Telegram
        await sendDetailedTelegram(user.id, 'New User Registered');

        res.status(201).json({ user, token });
    } catch (err) {
        console.error(`[Signup Error] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM ges_schema.users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FORGOT PASSWORD ---

// Check if mobile exists
app.post('/api/auth/check-phone', async (req, res) => {
    const { phone } = req.body;
    try {
        const result = await db.query('SELECT id FROM ges_schema.users WHERE phone = $1', [phone]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User does not exist with this mobile number' });
        }
        res.json({ success: true, userId: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset password by phone
app.post('/api/auth/reset-password-phone', async (req, res) => {
    const { phone, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await db.query('UPDATE ges_schema.users SET password_hash = $1, updated_at = NOW() WHERE phone = $2', [hashedPassword, phone]);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SOCIAL AUTH ---

// Google Login/Signup
app.post('/api/auth/google', async (req, res) => {
    const { idToken, accessToken } = req.body;
    try {
        let userData;

        if (idToken) {
            // Verify ID Token (Standard)
            const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            const { sub, email, given_name, family_name } = response.data;
            userData = { googleId: sub, email, firstName: given_name, lastName: family_name };
        } else if (accessToken) {
            // Fetch User Info using Access Token (For Custom Buttons/Implicit Flow)
            const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const { sub, email, given_name, family_name } = userInfoRes.data;
            userData = { googleId: sub, email, firstName: given_name, lastName: family_name };

            // Attempt to fetch phone number from People API (Requires scope: .../auth/user.phonenumbers.read)
            try {
                const peopleRes = await axios.get('https://people.googleapis.com/v1/people/me?personFields=phoneNumbers', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (peopleRes.data.phoneNumbers && peopleRes.data.phoneNumbers.length > 0) {
                    userData.phone = peopleRes.data.phoneNumbers[0].value;
                }
            } catch (pErr) {
                console.log("Could not fetch phone from People API (Scope might be missing):", pErr.message);
            }
        } else {
            return res.status(400).json({ error: 'No token provided' });
        }

        const { googleId, email, firstName, lastName, phone } = userData;
        console.log(`[Google Auth] Email: ${email}, GoogleID: ${googleId}, Phone: ${phone || 'N/A'}`);

        let result = await db.query('SELECT * FROM ges_schema.users WHERE google_id = $1 OR email = $2', [googleId, email]);
        let user;

        if (result.rows.length > 0) {
            user = result.rows[0];
            if (!user.google_id) {
                console.log(`[Google Update] Linking GoogleID to existing user: ${email}`);
                await db.query('UPDATE ges_schema.users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            }
            // If phone was missing but now we have it from API
            if (!user.phone && phone) {
                await db.query('UPDATE ges_schema.users SET phone = $1 WHERE id = $2', [phone, user.id]);
                user.phone = phone;
            }
        } else {
            console.log(`[Google Signup] Creating new user: ${email}`);
            const insertResult = await db.query(
                `INSERT INTO ges_schema.users (email, first_name, last_name, google_id, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [email, firstName, lastName, googleId, phone || null]
            );
            user = insertResult.rows[0];
            await sendDetailedTelegram(user.id, 'New Social User Registered (Google)');
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone
            },
            needsProfileUpdate: !user.phone
        });
    } catch (err) {
        console.error("Google Auth Error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// Update Phone (Quick endpoint for Social Users)
app.post('/api/profile/update-phone', authenticateToken, async (req, res) => {
    const { phone } = req.body;
    try {
        await db.query('UPDATE ges_schema.users SET phone = $1, updated_at = NOW() WHERE id = $2', [phone, req.user.id]);

        // Notify via Telegram about the update
        await sendDetailedTelegram(req.user.id, 'User Verified Phone Number', `Phone: ${phone}`);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Facebook Login/Signup
app.post('/api/auth/facebook', async (req, res) => {
    const { accessToken } = req.body;
    try {
        // Verify token with Facebook - Attempting to get phone (requires permission)
        const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,email,first_name,last_name,mobile_phone`);
        const { id: facebookId, email, first_name: firstName, last_name: lastName, mobile_phone: phone } = response.data;

        if (!email) {
            return res.status(400).json({ error: 'Facebook account must have an email address' });
        }

        // Check if user exists
        let result = await db.query('SELECT * FROM ges_schema.users WHERE facebook_id = $1 OR email = $2', [facebookId, email]);
        let user;

        if (result.rows.length > 0) {
            user = result.rows[0];
            if (!user.facebook_id) {
                await db.query('UPDATE ges_schema.users SET facebook_id = $1 WHERE id = $2', [facebookId, user.id]);
            }
        } else {
            // Create new social user
            const insertResult = await db.query(
                `INSERT INTO ges_schema.users (email, first_name, last_name, facebook_id, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [email, firstName, lastName, facebookId, phone || null]
            );
            user = insertResult.rows[0];
            await sendDetailedTelegram(user.id, 'New Social User Registered (Facebook)');
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone
            },
            needsProfileUpdate: !user.phone
        });
    } catch (err) {
        console.error("Facebook Auth Error:", err.message);
        res.status(500).json({ error: 'Facebook authentication failed' });
    }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, first_name, last_name, phone, dob, country_code, resume_name, photo_content FROM ges_schema.users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER PROFILE DETAILS ---

// Get All Profile Details
app.get('/api/profile/details', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [education, work, skills, tests, languages, visa, identity] = await Promise.all([
            getProfileRows('user_education', userId),
            getProfileRows('user_work_experience', userId),
            getProfileRows('user_skills', userId),
            getProfileRows('user_tests', userId),
            getProfileRows('user_languages', userId),
            getProfileRows('user_visa_history', userId),
            db.query('SELECT * FROM ges_schema.users WHERE id = $1', [userId])
        ]);

        res.json({
            education,
            work,
            skills,
            tests,
            languages,
            visa,
            identity: identity.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Profile Photo
app.post('/api/auth/profile/photo', authenticateToken, async (req, res) => {
    const { photoContent, photoType } = req.body;
    try {
        await db.query(
            'UPDATE ges_schema.users SET photo_content = $1, photo_type = $2, updated_at = NOW() WHERE id = $3',
            [photoContent, photoType, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Photo Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Resume Name
app.post('/api/auth/profile/resume', authenticateToken, async (req, res) => {
    const { resumeName } = req.body;
    try {
        await db.query(
            'UPDATE ges_schema.users SET resume_name = $1, updated_at = NOW() WHERE id = $2',
            [resumeName, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Resume Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Identity Details
app.post('/api/profile/identity', authenticateToken, async (req, res) => {
    const {
        firstName, lastName, middleName, dob, gender, maritalStatus, nationality,
        phone, countryCode, altPhone, altCountryCode, nickname, employmentStatus, skypeId, landline,
        githubId, linkedinId, currentLocation
    } = req.body;

    try {
        await db.query(
            `UPDATE ges_schema.users SET 
            first_name = $1, last_name = $2, middle_name = $3, dob = $4, gender = $5, 
            marital_status = $6, nationality = $7, phone = $8, country_code = $9, alt_phone = $10, alt_country_code = $11,
            nickname = $12, employment_status = $13, skype_id = $14, landline = $15, 
            github_id = $16, linkedin_id = $17, current_location = $18, updated_at = NOW() 
            WHERE id = $19`,
            [
                firstName, lastName, middleName, dob, gender, maritalStatus, nationality,
                phone, countryCode, altPhone, altCountryCode, nickname, employmentStatus, skypeId, landline,
                githubId, linkedinId, currentLocation, req.user.id
            ]
        );

        // Send Telegram Notification
        await sendDetailedTelegram(req.user.id, 'Profile Section Update: Identity', `Updated basic profile details.`);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- USER PROFILE SAVING (UPSERT/UPDATE/DELETE) ---

// Save Education
app.post('/api/profile/education', authenticateToken, async (req, res) => {
    const { id, institution, study_field, edu_level, degree, location, is_highest, start_month, start_year, end_month, end_year, course_type, study_mode, medium, division, score_type, score_value, info } = req.body;
    try {
        if (id) {
            // Update
            const result = await db.query(
                `UPDATE ges_schema.user_education SET 
                institution=$1, study_field=$2, edu_level=$3, degree=$4, location=$5, is_highest=$6, start_month=$7, start_year=$8, end_month=$9, end_year=$10, course_type=$11, study_mode=$12, medium=$13, division=$14, score_type=$15, score_value=$16, info=$17, updated_at=NOW()
                WHERE id=$18 AND user_id=$19 RETURNING *`,
                [institution, study_field, edu_level, degree, location, is_highest, start_month, start_year, end_month, end_year, course_type, study_mode, medium, division, score_type, score_value, info, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            // Insert
            const result = await db.query(
                `INSERT INTO ges_schema.user_education 
                (user_id, institution, study_field, edu_level, degree, location, is_highest, start_month, start_year, end_month, end_year, course_type, study_mode, medium, division, score_type, score_value, info) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
                RETURNING *`,
                [req.user.id, institution, study_field, edu_level, degree, location, is_highest, start_month, start_year, end_month, end_year, course_type, study_mode, medium, division, score_type, score_value, info]
            );
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Education', `Institution: ${institution}, Field: ${study_field}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic Delete Handler Factory
const createDeleteHandler = (tableName) => async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM ges_schema.${tableName} WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Deletion Routes
app.delete('/api/profile/education/:id', authenticateToken, createDeleteHandler('user_education'));
app.delete('/api/profile/work/:id', authenticateToken, createDeleteHandler('user_work_experience'));
app.delete('/api/profile/skills/:id', authenticateToken, createDeleteHandler('user_skills'));
app.delete('/api/profile/tests/:id', authenticateToken, createDeleteHandler('user_tests'));
app.delete('/api/profile/languages/:id', authenticateToken, createDeleteHandler('user_languages'));
app.delete('/api/profile/visa/:id', authenticateToken, createDeleteHandler('user_visa_history'));

// Save Work Experience (Upsert)
app.post('/api/profile/work', authenticateToken, async (req, res) => {
    const { id, company, domain, role, location, is_current, start_month, start_year, end_month, end_year, employment_type, industry, responsibilities, achievements, info } = req.body;
    try {
        if (id) {
            // Update
            const result = await db.query(
                `UPDATE ges_schema.user_work_experience SET 
                company=$1, domain=$2, role=$3, location=$4, is_current=$5, start_month=$6, start_year=$7, end_month=$8, end_year=$9, employment_type=$10, industry=$11, responsibilities=$12, achievements=$13, info=$14, updated_at=NOW()
                WHERE id=$15 AND user_id=$16 RETURNING *`,
                [company, domain, role, location, is_current, start_month, start_year, end_month, end_year, employment_type, industry, responsibilities, achievements, info, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            // Insert
            const result = await db.query(
                `INSERT INTO ges_schema.user_work_experience 
                (user_id, company, domain, role, location, is_current, start_month, start_year, end_month, end_year, employment_type, industry, responsibilities, achievements, info) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
                RETURNING *`,
                [req.user.id, company, domain, role, location, is_current, start_month, start_year, end_month, end_year, employment_type, industry, responsibilities, achievements, info]
            );
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Work Experience', `Company: ${company}, Role: ${role}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Skill
app.post('/api/profile/skills', authenticateToken, async (req, res) => {
    const { id, skill_name } = req.body;
    try {
        if (id) {
            const result = await db.query(
                'UPDATE ges_schema.user_skills SET skill_name=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *',
                [skill_name, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(`INSERT INTO ges_schema.user_skills (user_id, skill_name) VALUES ($1, $2) RETURNING *`, [req.user.id, skill_name]);
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Skills', `Skill Added: ${skill_name}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Test
app.post('/api/profile/tests', authenticateToken, async (req, res) => {
    const { id, test_name, score, taken_month, taken_year, valid_month, valid_year } = req.body;
    try {
        if (id) {
            const result = await db.query(
                `UPDATE ges_schema.user_tests
                 SET test_name=$1, score=$2, taken_month=$3, taken_year=$4, valid_month=$5, valid_till_month=$5, valid_year=$6, valid_till_year=$6, updated_at=NOW()
                 WHERE id=$7 AND user_id=$8 RETURNING *`,
                [test_name, score, taken_month, taken_year, valid_month, valid_year, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(
                `INSERT INTO ges_schema.user_tests (user_id, test_name, score, taken_month, taken_year, valid_month, valid_till_month, valid_year, valid_till_year) 
                VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7) RETURNING *`,
                [req.user.id, test_name, score, taken_month, taken_year, valid_month, valid_year]
            );
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Tests', `Test: ${test_name}, Score: ${score}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Language
app.post('/api/profile/languages', authenticateToken, async (req, res) => {
    const { id, name, overall, listening, speaking, reading, writing } = req.body;
    try {
        if (id) {
            const result = await db.query(
                `UPDATE ges_schema.user_languages
                 SET name=$1, overall=$2, listening=$3, speaking=$4, reading=$5, writing=$6, updated_at=NOW()
                 WHERE id=$7 AND user_id=$8 RETURNING *`,
                [name, overall, listening, speaking, reading, writing, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(
                `INSERT INTO ges_schema.user_languages (user_id, name, overall, listening, speaking, reading, writing) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [req.user.id, name, overall, listening, speaking, reading, writing]
            );
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Language', `Language: ${name}, Overall: ${overall}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Visa History
app.post('/api/profile/visa', authenticateToken, async (req, res) => {
    const { id, type, country, specification, valid_date, valid_month, valid_year } = req.body;
    try {
        if (id) {
            const result = await db.query(
                `UPDATE ges_schema.user_visa_history
                 SET type=$1, country=$2, specification=$3, valid_date=$4, valid_month=$5, valid_till_month=$5, valid_year=$6, valid_till_year=$6, updated_at=NOW()
                 WHERE id=$7 AND user_id=$8 RETURNING *`,
                [type, country, specification, valid_date, valid_month, valid_year, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(
                `INSERT INTO ges_schema.user_visa_history (user_id, type, country, specification, valid_date, valid_month, valid_till_month, valid_year, valid_till_year) 
                VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7) RETURNING *`,
                [req.user.id, type, country, specification, valid_date, valid_month, valid_year]
            );
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Visa History', `Type: ${type}, Country: ${country}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- JOBS SITE ---

// Search Jobs (via Jooble)
app.post('/api/jobs/search', async (req, res) => {
    const { keywords, location } = req.body;
    console.log(`[Job Search] Keywords: ${keywords}, Location: ${location}`);

    // Optional user logging if token provided
    let userId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (e) { /* ignore invalid token for search */ }
    }

    if (!JOOBLE_API_KEY) {
        console.error("Jooble API Key missing in .env");
        return res.status(500).json({ error: 'Job search is currently unavailable' });
    }

    try {
        // Log the search query to DB
        await db.query(
            'INSERT INTO ges_schema.job_search_logs (user_id, search_query, location) VALUES ($1, $2, $3)',
            [userId, keywords, location]
        );

        const response = await axios.post(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
            keywords,
            location
        });

        // Jooble returns { totalCount, jobs: [] }
        res.json({ jobs: response.data.jobs || [] });
    } catch (err) {
        console.error("Job Search/Logging Error:", err.message);
        // We still return jobs if search worked but logging failed
        if (err.response) { // Jooble error
            res.status(500).json({ error: 'Failed to fetch jobs' });
        } else {
            // Logging failed, but we might still have fetched jobs?? 
            // Actually if logging fails before axios, we might want to proceed?
            // Let's re-try the search without logging if it failed
            try {
                const response = await axios.post(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
                    keywords,
                    location
                });
                res.json({ jobs: response.data.jobs || [] });
            } catch (retryErr) {
                res.status(500).json({ error: 'Failed to fetch jobs' });
            }
        }
    }
});

// Job Application Tracking & Telegram Alert
app.post('/api/jobs/apply', authenticateToken, async (req, res) => {
    const { jobId, jobTitle, company, location } = req.body;
    const userId = req.user.id;

    console.log(`[Job Apply] User ${userId} applied for ${jobTitle} at ${company}`);

    try {
        // Fetch user info for Telegram
        const userRes = await db.query('SELECT * FROM ges_schema.users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Record application in DB
        await db.query(
            `INSERT INTO ges_schema.applications (user_id, job_id, job_title, company, location) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, jobId, jobTitle, company, location]
        );

        const message = `
🚀 <b>New Job Application</b>

👤 <b>Applicant:</b> ${user.first_name} ${user.last_name}
📧 <b>Email:</b> ${user.email}
📱 <b>Phone:</b> ${user.country_code || ''} ${user.phone}

💼 <b>Position:</b> ${jobTitle}
🏢 <b>Company:</b> ${company}
📍 <b>Location:</b> ${location}
🆔 <b>Job ID:</b> ${jobId}

🕒 <b>Time:</b> ${new Date().toLocaleString()}
`;
        await sendTelegramNotification(message);

        res.json({ success: true, message: 'Application shared with recruiter successfully' });
    } catch (err) {
        console.error("Job Application Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const startServer = async () => {
    try {
        await db.query('SELECT 1');
        await ensureProfileSchema();
        console.log('-----------------------------------------');
        console.log(`[${new Date().toLocaleTimeString()}] CONNECTED TO POSTGRESQL`);
        console.log(`[${new Date().toLocaleTimeString()}] SERVER RUNNING ON PORT: ${PORT}`);
        console.log(`[${new Date().toLocaleTimeString()}] LOGGING ENABLED - WAITING FOR REQUESTS...`);
        console.log('-----------------------------------------');

        app.listen(PORT, () => {
            // Startup success
        });
    } catch (err) {
        console.error('DATABASE CONNECTION FAILED:', err.message);
        process.exit(1);
    }
};

startServer();

// --- DEBUG: Test Telegram ---
app.get('/api/test-telegram', async (req, res) => {
    console.log('🔔 Test Telegram triggered');
    console.log('Token:', process.env.TELEGRAM_BOT_TOKEN ? 'SET ✅' : 'MISSING ❌');
    console.log('Chat ID:', process.env.TELEGRAM_CHAT_ID ? 'SET ✅' : 'MISSING ❌');
    try {
        await sendTelegramNotification(`🧪 Test message from GES Server\n⏰ Time: ${new Date().toLocaleString()}`);
        res.json({ success: true, message: 'Telegram test message sent! Check your Telegram.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Catch-all 404 handler (always return JSON)
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler (always return JSON)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
