/* ===================================================
   DormLink — seed.js
   One-time database setup script.

   Creates:
     - dormlink_shenangel database (if not exists)
     - landlord table
     - listings table
     - Inserts the single landlord account with a bcrypt-hashed password

   RUN ONCE:  node seed.js
   =================================================== */

'use strict';

require('dotenv').config();
const sql = require('mssql/msnodesqlv8');
const bcrypt = require('bcryptjs');

// Connect to master first (to create our database if needed)
// Uses Windows Authentication via native ODBC driver
const dbServer = process.env.DB_SERVER || 'SHENA-MAE\\SQLEXPRESS01';
const dbName   = process.env.DB_NAME   || 'dormlink_shenangel';

const masterConfig = {
  connectionString:
    `Driver={SQL Server Native Client 10.0};` +
    `Server=${dbServer};` +
    `Database=master;` +
    `Trusted_Connection=yes;`,
  driver: 'msnodesqlv8',
};

async function seed() {
  let pool;

  try {
    console.log('🔌  Connecting to SQL Server (master)...');
    pool = await sql.connect(masterConfig);
    console.log('✅  Connected.');

    // ── Step 1: Create database if it doesn't exist ──
    console.log(`\n📦  Creating database ${dbName} if not exists...`);
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
      BEGIN
        CREATE DATABASE [${dbName}];
        PRINT 'Database created.';
      END
      ELSE
      BEGIN
        PRINT 'Database already exists.';
      END
    `);
    console.log('✅  Database ready.');

    // Switch to our database
    await pool.close();
    const dbConfig = {
      connectionString:
        `Driver={SQL Server Native Client 10.0};` +
        `Server=${dbServer};` +
        `Database=${dbName};` +
        `Trusted_Connection=yes;`,
      driver: 'msnodesqlv8',
    };
    pool = await sql.connect(dbConfig);
    console.log('\n🔌  Connected to dormlink_shenangel.');

    // ── Step 2: Create landlord table ──
    console.log('\n📋  Creating landlord table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'landlord')
      BEGIN
        CREATE TABLE landlord (
          id            INT           PRIMARY KEY,
          username      NVARCHAR(100) NOT NULL,
          password_hash NVARCHAR(255) NOT NULL
        );
        PRINT 'landlord table created.';
      END
    `);
    console.log('✅  landlord table ready.');

    // ── Step 3: Create listings table ──
    console.log('\n📋  Creating listings table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'listings')
      BEGIN
        CREATE TABLE listings (
          id                            INT           PRIMARY KEY IDENTITY(1,1),

          -- Property Details
          name                          NVARCHAR(200) NOT NULL,
          description                   NVARCHAR(MAX),
          address                       NVARCHAR(500) NOT NULL,

          -- Pricing
          monthly_rent                  DECIMAL(10,2) NOT NULL,
          security_deposit              DECIMAL(10,2),
          advance_payment               DECIMAL(10,2),

          -- Utilities
          water_included                BIT           DEFAULT 0,
          electricity_included          BIT           DEFAULT 0,
          wifi_included                 BIT           DEFAULT 0,

          -- Additional Fees
          additional_fees               NVARCHAR(MAX),

          -- Room Information
          room_type                     NVARCHAR(50)  NOT NULL DEFAULT 'Solo Room',
          occupants_allowed             INT,
          room_size                     NVARCHAR(100),
          available_rooms               INT,
          available_beds                INT,

          -- Amenities
          amenity_wifi                  BIT           DEFAULT 0,
          amenity_aircon                BIT           DEFAULT 0,
          amenity_electric_fan          BIT           DEFAULT 0,
          amenity_private_cr            BIT           DEFAULT 0,
          amenity_shared_cr             BIT           DEFAULT 0,
          amenity_kitchen               BIT           DEFAULT 0,
          amenity_laundry               BIT           DEFAULT 0,
          amenity_parking               BIT           DEFAULT 0,
          amenity_study_area            BIT           DEFAULT 0,
          amenity_cctv                  BIT           DEFAULT 0,
          amenity_security_guard        BIT           DEFAULT 0,
          amenity_water_supply          BIT           DEFAULT 0,

          -- House Rules
          rule_curfew                   BIT           DEFAULT 0,
          rule_visitors_allowed         BIT           DEFAULT 0,
          rule_cooking_allowed          BIT           DEFAULT 0,
          rule_drinking_allowed         BIT           DEFAULT 0,
          rule_smoking_allowed          BIT           DEFAULT 0,
          rule_pets_allowed             BIT           DEFAULT 0,
          rule_male_only                BIT           DEFAULT 0,
          rule_female_only              BIT           DEFAULT 0,
          rule_students_only            BIT           DEFAULT 0,
          rule_working_professionals_only BIT         DEFAULT 0,

          -- Availability
          availability_status           NVARCHAR(20)  NOT NULL DEFAULT 'Available',
          date_available                DATE,
          last_updated                  DATETIME      NOT NULL DEFAULT GETDATE(),

          -- Owner Contact
          owner_name                    NVARCHAR(200),
          contact_number                NVARCHAR(50),

          -- Image
          image_filename                NVARCHAR(255)
        );
        PRINT 'listings table created.';
      END
    `);
    console.log('✅  listings table ready.');

    // ── Step 4: Seed landlord account ──
    console.log('\n👤  Seeding landlord account...');
    const checkLandlord = await pool.request()
      .query('SELECT COUNT(*) AS cnt FROM landlord WHERE id = 1');

    if (checkLandlord.recordset[0].cnt === 0) {
      const username = process.env.LANDLORD_USERNAME || 'admin';
      const plainPassword = process.env.LANDLORD_PASSWORD || 'dormlink2024';
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

      await pool.request()
        .input('id', sql.Int, 1)
        .input('username', sql.NVarChar(100), username)
        .input('password_hash', sql.NVarChar(255), passwordHash)
        .query('INSERT INTO landlord (id, username, password_hash) VALUES (@id, @username, @password_hash)');

      console.log(`✅  Landlord account created.`);
      console.log(`    Username : ${username}`);
      console.log(`    Password : ${plainPassword}  ← (change this in .env before deployment)`);
    } else {
      console.log('ℹ️   Landlord account already exists. Skipping.');
    }

    console.log('\n🎉  Database seed complete! DormLink is ready.');
    console.log('    Run: npm run dev\n');
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

seed();
