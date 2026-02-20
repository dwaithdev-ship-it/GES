const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();

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

// Helper to send Telegram notification
const sendTelegramNotification = async (message) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("Telegram credentials missing in .env");
        return;
    }
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (err) {
        console.error("Telegram Error:", err.message);
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
    const { idToken } = req.body;
    try {
        const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        const { sub: googleId, email, given_name: firstName, family_name: lastName } = response.data;
        console.log(`[Google Login] Email: ${email}, GoogleID: ${googleId}`);

        let result = await db.query('SELECT * FROM ges_schema.users WHERE google_id = $1 OR email = $2', [googleId, email]);
        let user;

        if (result.rows.length > 0) {
            user = result.rows[0];
            if (!user.google_id) {
                console.log(`[Google Update] Linking GoogleID to existing user: ${email}`);
                await db.query('UPDATE ges_schema.users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            }
        } else {
            console.log(`[Google Signup] Creating new user: ${email}`);
            const insertResult = await db.query(
                `INSERT INTO ges_schema.users (email, first_name, last_name, google_id) VALUES ($1, $2, $3, $4) RETURNING *`,
                [email, firstName, lastName, googleId]
            );
            user = insertResult.rows[0];
            await sendDetailedTelegram(user.id, 'New Social User Registered (Google)');
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } });
    } catch (err) {
        console.error("Google Auth Error:", err.message);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// Facebook Login/Signup
app.post('/api/auth/facebook', async (req, res) => {
    const { accessToken } = req.body;
    try {
        // Verify token with Facebook
        const response = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,email,first_name,last_name`);
        const { id: facebookId, email, first_name: firstName, last_name: lastName } = response.data;

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
                `INSERT INTO ges_schema.users (email, first_name, last_name, facebook_id) VALUES ($1, $2, $3, $4) RETURNING *`,
                [email, firstName, lastName, facebookId]
            );
            user = insertResult.rows[0];
            await sendDetailedTelegram(user.id, 'New Social User Registered (Facebook)');
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } });
    } catch (err) {
        console.error("Facebook Auth Error:", err.message);
        res.status(500).json({ error: 'Facebook authentication failed' });
    }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, first_name, last_name, phone, dob, country_code, resume_name, (photo_content IS NOT NULL) as has_photo FROM ges_schema.users WHERE id = $1', [req.user.id]);
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
        const education = await db.query('SELECT * FROM ges_schema.user_education WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const work = await db.query('SELECT * FROM ges_schema.user_work_experience WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const skills = await db.query('SELECT * FROM ges_schema.user_skills WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const tests = await db.query('SELECT * FROM ges_schema.user_tests WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const languages = await db.query('SELECT * FROM ges_schema.user_languages WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        const visa = await db.query('SELECT * FROM ges_schema.user_visa_history WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

        // Also fetch identity details to pre-fill identity modal
        const identity = await db.query('SELECT * FROM ges_schema.users WHERE id = $1', [userId]);

        res.json({
            education: education.rows,
            work: work.rows,
            skills: skills.rows,
            tests: tests.rows,
            languages: languages.rows,
            visa: visa.rows,
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

// Update Identity Details
app.post('/api/profile/identity', authenticateToken, async (req, res) => {
    const {
        firstName, lastName, middleName, dob, gender, maritalStatus, nationality,
        phone, altPhone, nickname, employmentStatus, skypeId, landline,
        githubId, linkedinId, currentLocation
    } = req.body;

    try {
        await db.query(
            `UPDATE ges_schema.users SET 
            first_name = $1, last_name = $2, middle_name = $3, dob = $4, gender = $5, 
            marital_status = $6, nationality = $7, phone = $8, alt_phone = $9, 
            nickname = $10, employment_status = $11, skype_id = $12, landline = $13, 
            github_id = $14, linkedin_id = $15, current_location = $16, updated_at = NOW() 
            WHERE id = $17`,
            [
                firstName, lastName, middleName, dob, gender, maritalStatus, nationality,
                phone, altPhone, nickname, employmentStatus, skypeId, landline,
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
                institution=$1, field_of_study=$2, education_level=$3, degree_name=$4, location=$5, is_highest_education=$6, start_month=$7, start_year=$8, end_month=$9, end_year=$10, course_type=$11, study_mode=$12, medium_of_education=$13, division=$14, score_type=$15, score_value=$16, additional_info=$17, updated_at=NOW()
                WHERE id=$18 AND user_id=$19 RETURNING *`,
                [institution, study_field, edu_level, degree, location, is_highest, start_month, start_year, end_month, end_year, course_type, study_mode, medium, division, score_type, score_value, info, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            // Insert
            const result = await db.query(
                `INSERT INTO ges_schema.user_education 
                (user_id, institution, field_of_study, education_level, degree_name, location, is_highest_education, start_month, start_year, end_month, end_year, course_type, study_mode, medium_of_education, division, score_type, score_value, additional_info) 
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
                company=$1, functional_area=$2, role=$3, location=$4, is_current_role=$5, start_month=$6, start_year=$7, end_month=$8, end_year=$9, employment_type=$10, industry=$11, responsibilities=$12, achievements=$13, additional_info=$14, updated_at=NOW()
                WHERE id=$15 AND user_id=$16 RETURNING *`,
                [company, domain, role, location, is_current, start_month, start_year, end_month, end_year, employment_type, industry, responsibilities, achievements, info, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            // Insert
            const result = await db.query(
                `INSERT INTO ges_schema.user_work_experience 
                (user_id, company, functional_area, role, location, is_current_role, start_month, start_year, end_month, end_year, employment_type, industry, responsibilities, achievements, additional_info) 
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
            await db.query('UPDATE ges_schema.user_skills SET skill_name=$1 WHERE id=$2 AND user_id=$3', [skill_name, id, req.user.id]);
            res.json({ success: true });
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
                `UPDATE ges_schema.user_tests SET test_name=$1, score=$2, taken_month=$3, taken_year=$4, valid_till_month=$5, valid_till_year=$6 WHERE id=$7 AND user_id=$8 RETURNING *`,
                [test_name, score, taken_month, taken_year, valid_month, valid_year, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(
                `INSERT INTO ges_schema.user_tests (user_id, test_name, score, taken_month, taken_year, valid_till_month, valid_till_year) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
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
                `UPDATE ges_schema.user_languages SET language_name=$1, overall_proficiency=$2, listening_proficiency=$3, speaking_proficiency=$4, reading_proficiency=$5, writing_proficiency=$6 WHERE id=$7 AND user_id=$8 RETURNING *`,
                [name, overall, listening, speaking, reading, writing, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(
                `INSERT INTO ges_schema.user_languages (user_id, language_name, overall_proficiency, listening_proficiency, speaking_proficiency, reading_proficiency, writing_proficiency) 
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
                `UPDATE ges_schema.user_visa_history SET visa_type=$1, country=$2, specification=$3, valid_till_date=$4, valid_till_month=$5, valid_till_year=$6 WHERE id=$7 AND user_id=$8 RETURNING *`,
                [type, country, specification, valid_date, valid_month, valid_year, id, req.user.id]
            );
            res.json({ success: true, data: result.rows[0] });
        } else {
            const result = await db.query(
                `INSERT INTO ges_schema.user_visa_history (user_id, visa_type, country, specification, valid_till_date, valid_till_month, valid_till_year) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [req.user.id, type, country, specification, valid_date, valid_month, valid_year]
            );
            await sendDetailedTelegram(req.user.id, 'Profile Section Update: Visa History', `Type: ${type}, Country: ${country}`);
            res.status(201).json({ success: true, data: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const startServer = async () => {
    try {
        await db.query('SELECT 1');
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

// Catch-all 404 handler (always return JSON)
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler (always return JSON)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
