/* ===================================================
   DormLink — routes/authRoutes.js
   =================================================== */

'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/auth');

// GET  /api/auth/status  — check if logged in (no auth required)
router.get('/status', authController.status);

// POST /api/auth/login   — validate credentials and create session
router.post('/login', authController.login);

// POST /api/auth/logout  — destroy session (auth required)
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
