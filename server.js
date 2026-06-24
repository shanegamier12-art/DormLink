/* ===================================================
   DormLink — server.js
   Main application entry point
   =================================================== */

'use strict';

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

// Route modules
const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Headers ────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow inline styles/scripts in HTML files
  })
);

// ── Body Parsers ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ─────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dormlink_fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,        // Set to true only in HTTPS production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// ── Static Files ─────────────────────────────────────
// Serve HTML pages from /public
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ───────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);

// ── Catch-all: serve index.html for any non-API, non-file route ──
app.get('/{*path}', (req, res) => {
  // Only catch non-API requests
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ── Start Server ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  DormLink server running at http://localhost:${PORT}`);
});

module.exports = app;
