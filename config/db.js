/* ===================================================
   DormLink — config/db.js
   MSSQL Connection using Windows Authentication (ODBC)
   Uses msnodesqlv8 — native Windows SQL Server driver
   =================================================== */

'use strict';

require('dotenv').config();
const sql = require('mssql/msnodesqlv8');

// Windows Authentication connection string via ODBC
// Uses the SQL Server ODBC Driver with Trusted_Connection
const connectionString =
  `Driver={SQL Server Native Client 10.0};` +
  `Server=${process.env.DB_SERVER || 'SHENA-MAE\\SQLEXPRESS01'};` +
  `Database=${process.env.DB_NAME || 'dormlink_shenangel'};` +
  `Trusted_Connection=yes;`;

const dbConfig = {
  connectionString,
  driver: 'msnodesqlv8',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    trustServerCertificate: true,
  },
};

// Singleton connection pool
let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅  Connected to SQL Server — dormlink_shenangel');
    return pool;
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    throw err;
  }
}

module.exports = { getPool, sql };
