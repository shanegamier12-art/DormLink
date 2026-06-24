/* ===================================================
   DormLink — controllers/authController.js
   Handles landlord login, logout, and session status
   =================================================== */

'use strict';

const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body;

  // Basic input validation
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar(100), username.trim())
      .query('SELECT id, username, password_hash FROM landlord WHERE username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const landlord = result.recordset[0];
    const passwordMatch = await bcrypt.compare(password, landlord.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Create session
    req.session.isLoggedIn = true;
    req.session.landlordId = landlord.id;
    req.session.landlordUsername = landlord.username;

    return res.json({ success: true, message: 'Login successful.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
}

// POST /api/auth/logout
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
}

// GET /api/auth/status
function status(req, res) {
  if (req.session && req.session.isLoggedIn === true) {
    return res.json({ loggedIn: true, username: req.session.landlordUsername });
  }
  return res.json({ loggedIn: false });
}

module.exports = { login, logout, status };
