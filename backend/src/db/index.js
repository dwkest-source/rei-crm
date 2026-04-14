const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by UUID REFERENCES users(id),
        assigned_to UUID REFERENCES users(id),
        
        -- Property Info
        property_address TEXT,
        property_city VARCHAR(255),
        property_state VARCHAR(10),
        property_zip VARCHAR(20),
        property_type VARCHAR(100),
        
        -- Owner Info
        owner_first_name VARCHAR(255),
        owner_last_name VARCHAR(255),
        owner_email VARCHAR(255),
        owner_phone VARCHAR(50),
        owner_phone2 VARCHAR(50),
        owner_phone3 VARCHAR(50),
        owner_mailing_address TEXT,
        owner_mailing_city VARCHAR(255),
        owner_mailing_state VARCHAR(10),
        owner_mailing_zip VARCHAR(20),
        
        -- Lead Details
        source VARCHAR(100),
        status VARCHAR(100) DEFAULT 'New Lead',
        motivation TEXT,
        asking_price NUMERIC(12,2),
        estimated_arv NUMERIC(12,2),
        estimated_repair NUMERIC(12,2),
        offer_price NUMERIC(12,2),
        
        -- Marketing
        campaign VARCHAR(255),
        list_name VARCHAR(255),
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        assigned_to UUID REFERENCES users(id),
        created_by UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        priority VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        type VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrations - add new columns if they don't exist
    await client.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_phone2 VARCHAR(50);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_phone3 VARCHAR(50);
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
