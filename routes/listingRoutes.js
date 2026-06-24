/* ===================================================
   DormLink — routes/listingRoutes.js
   =================================================== */

'use strict';

const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const requireAuth = require('../middleware/auth');
const upload = require('../config/multer');

// ── Public Routes (Tenant Access) ──────────────────
// GET /api/listings         — get all listings (with optional filters)
router.get('/', listingsController.getAll);

// GET /api/listings/:id     — get single listing details
router.get('/:id', listingsController.getById);

// ── Protected Routes (Landlord Only) ───────────────
// POST /api/listings        — create new listing (with optional image)
router.post('/', requireAuth, upload.single('image'), listingsController.create);

// PUT /api/listings/:id     — update existing listing
router.put('/:id', requireAuth, upload.single('image'), listingsController.update);

// DELETE /api/listings/:id  — delete listing and its image
router.delete('/:id', requireAuth, listingsController.remove);

module.exports = router;
