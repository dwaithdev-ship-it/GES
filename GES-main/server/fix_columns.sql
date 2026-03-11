-- RUN THIS IN YOUR POSTGRES TERMINAL (e.g. psql or pgAdmin)
-- Make sure you are connected to the 'ges_dev' database.

-- 1. Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS ges_schema;

-- 2. If you already have a users table, let's make sure it has the EXACT column names
-- If you have firstName, rename to first_name, etc.

DO $$ 
BEGIN
    -- Rename firstName to first_name if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'firstname') THEN
        ALTER TABLE ges_schema.users RENAME COLUMN firstname TO first_name;
    END IF;

    -- Rename lastName to last_name if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'lastname') THEN
        ALTER TABLE ges_schema.users RENAME COLUMN lastname TO last_name;
    END IF;

    -- Rename country_code if you created it with a space or differently
    -- Note: This is an example, if you named it "country code", use that in the condition.
    -- Better to just add them if they are missing:

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE ges_schema.users ADD COLUMN email VARCHAR(255) UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE ges_schema.users ADD COLUMN password_hash TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE ges_schema.users ADD COLUMN first_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE ges_schema.users ADD COLUMN last_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE ges_schema.users ADD COLUMN phone VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'dob') THEN
        ALTER TABLE ges_schema.users ADD COLUMN dob DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'country_code') THEN
        ALTER TABLE ges_schema.users ADD COLUMN country_code VARCHAR(10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE ges_schema.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ges_schema' AND table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE ges_schema.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
