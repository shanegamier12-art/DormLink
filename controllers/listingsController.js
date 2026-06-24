/* ===================================================
   DormLink — controllers/listingsController.js
   Handles all CRUD operations for boarding house listings
   =================================================== */

'use strict';

const { getPool, sql } = require('../config/db');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// GET /api/listings
// Public — returns all listings with optional search + filter
// ─────────────────────────────────────────────
async function getAll(req, res) {
  const { search, roomType, availability, minRent, maxRent } = req.query;

  try {
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT
        id, name, address, monthly_rent, room_type,
        availability_status, available_rooms, available_beds,
        image_filename, owner_name, contact_number,
        amenity_wifi, amenity_aircon, amenity_electric_fan,
        amenity_private_cr, amenity_shared_cr, amenity_kitchen,
        amenity_laundry, amenity_parking, amenity_study_area,
        amenity_cctv, amenity_security_guard, amenity_water_supply,
        last_updated
      FROM listings
      WHERE 1=1
    `;

    if (search) {
      request.input('search', sql.NVarChar(200), `%${search.trim()}%`);
      query += ' AND (name LIKE @search OR address LIKE @search)';
    }

    if (roomType && roomType !== 'All') {
      request.input('roomType', sql.NVarChar(50), roomType.trim());
      query += ' AND room_type = @roomType';
    }

    if (availability && availability !== 'All') {
      request.input('availability', sql.NVarChar(20), availability.trim());
      query += ' AND availability_status = @availability';
    }

    if (minRent) {
      request.input('minRent', sql.Decimal(10, 2), parseFloat(minRent));
      query += ' AND monthly_rent >= @minRent';
    }

    if (maxRent) {
      request.input('maxRent', sql.Decimal(10, 2), parseFloat(maxRent));
      query += ' AND monthly_rent <= @maxRent';
    }

    query += ' ORDER BY last_updated DESC';

    const result = await request.query(query);
    return res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('getAll error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch listings.' });
  }
}

// ─────────────────────────────────────────────
// GET /api/listings/:id
// Public — returns full details for a single listing
// ─────────────────────────────────────────────
async function getById(req, res) {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid listing ID.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT * FROM listings WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    return res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('getById error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch listing.' });
  }
}

// ─────────────────────────────────────────────
// POST /api/listings
// Protected — create a new listing
// ─────────────────────────────────────────────
async function create(req, res) {
  const body = req.body;
  const imageFilename = req.file ? req.file.filename : null;

  try {
    const pool = await getPool();
    const request = pool.request();

    bindListingParams(request, body, sql);
    request.input('image_filename', sql.NVarChar(255), imageFilename);

    const result = await request.query(`
      INSERT INTO listings (
        name, description, address,
        monthly_rent, security_deposit, advance_payment,
        water_included, electricity_included, wifi_included,
        additional_fees, room_type, occupants_allowed,
        room_size, available_rooms, available_beds,
        amenity_wifi, amenity_aircon, amenity_electric_fan,
        amenity_private_cr, amenity_shared_cr, amenity_kitchen,
        amenity_laundry, amenity_parking, amenity_study_area,
        amenity_cctv, amenity_security_guard, amenity_water_supply,
        rule_curfew, rule_visitors_allowed, rule_cooking_allowed,
        rule_drinking_allowed, rule_smoking_allowed, rule_pets_allowed,
        rule_male_only, rule_female_only, rule_students_only,
        rule_working_professionals_only,
        availability_status, date_available, last_updated,
        owner_name, contact_number, image_filename
      )
      OUTPUT INSERTED.id
      VALUES (
        @name, @description, @address,
        @monthly_rent, @security_deposit, @advance_payment,
        @water_included, @electricity_included, @wifi_included,
        @additional_fees, @room_type, @occupants_allowed,
        @room_size, @available_rooms, @available_beds,
        @amenity_wifi, @amenity_aircon, @amenity_electric_fan,
        @amenity_private_cr, @amenity_shared_cr, @amenity_kitchen,
        @amenity_laundry, @amenity_parking, @amenity_study_area,
        @amenity_cctv, @amenity_security_guard, @amenity_water_supply,
        @rule_curfew, @rule_visitors_allowed, @rule_cooking_allowed,
        @rule_drinking_allowed, @rule_smoking_allowed, @rule_pets_allowed,
        @rule_male_only, @rule_female_only, @rule_students_only,
        @rule_working_professionals_only,
        @availability_status, @date_available, GETDATE(),
        @owner_name, @contact_number, @image_filename
      )
    `);

    const newId = result.recordset[0].id;
    return res.status(201).json({ success: true, id: newId, message: 'Listing created successfully.' });
  } catch (err) {
    console.error('create error:', err);
    // Clean up uploaded file if DB insert fails
    if (imageFilename) {
      const filePath = path.join(__dirname, '..', 'uploads', imageFilename);
      fs.unlink(filePath, () => {});
    }
    return res.status(500).json({ success: false, message: 'Failed to create listing.' });
  }
}

// ─────────────────────────────────────────────
// PUT /api/listings/:id
// Protected — update an existing listing
// ─────────────────────────────────────────────
async function update(req, res) {
  const { id } = req.params;
  const body = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid listing ID.' });
  }

  try {
    const pool = await getPool();

    // Get current image filename before updating
    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT image_filename FROM listings WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const oldImageFilename = existing.recordset[0].image_filename;
    const newImageFilename = req.file ? req.file.filename : oldImageFilename;

    const request = pool.request();
    bindListingParams(request, body, sql);
    request.input('id', sql.Int, parseInt(id));
    request.input('image_filename', sql.NVarChar(255), newImageFilename);

    await request.query(`
      UPDATE listings SET
        name = @name, description = @description, address = @address,
        monthly_rent = @monthly_rent, security_deposit = @security_deposit,
        advance_payment = @advance_payment,
        water_included = @water_included, electricity_included = @electricity_included,
        wifi_included = @wifi_included, additional_fees = @additional_fees,
        room_type = @room_type, occupants_allowed = @occupants_allowed,
        room_size = @room_size, available_rooms = @available_rooms,
        available_beds = @available_beds,
        amenity_wifi = @amenity_wifi, amenity_aircon = @amenity_aircon,
        amenity_electric_fan = @amenity_electric_fan,
        amenity_private_cr = @amenity_private_cr, amenity_shared_cr = @amenity_shared_cr,
        amenity_kitchen = @amenity_kitchen, amenity_laundry = @amenity_laundry,
        amenity_parking = @amenity_parking, amenity_study_area = @amenity_study_area,
        amenity_cctv = @amenity_cctv, amenity_security_guard = @amenity_security_guard,
        amenity_water_supply = @amenity_water_supply,
        rule_curfew = @rule_curfew, rule_visitors_allowed = @rule_visitors_allowed,
        rule_cooking_allowed = @rule_cooking_allowed,
        rule_drinking_allowed = @rule_drinking_allowed,
        rule_smoking_allowed = @rule_smoking_allowed,
        rule_pets_allowed = @rule_pets_allowed,
        rule_male_only = @rule_male_only, rule_female_only = @rule_female_only,
        rule_students_only = @rule_students_only,
        rule_working_professionals_only = @rule_working_professionals_only,
        availability_status = @availability_status,
        date_available = @date_available,
        last_updated = GETDATE(),
        owner_name = @owner_name, contact_number = @contact_number,
        image_filename = @image_filename
      WHERE id = @id
    `);

    // Delete old image if a new one was uploaded
    if (req.file && oldImageFilename) {
      const oldPath = path.join(__dirname, '..', 'uploads', oldImageFilename);
      fs.unlink(oldPath, () => {});
    }

    return res.json({ success: true, message: 'Listing updated successfully.' });
  } catch (err) {
    console.error('update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update listing.' });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/listings/:id
// Protected — delete a listing and its image
// ─────────────────────────────────────────────
async function remove(req, res) {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid listing ID.' });
  }

  try {
    const pool = await getPool();

    // Get image filename before deleting
    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT image_filename FROM listings WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const imageFilename = existing.recordset[0].image_filename;

    // Delete from database
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM listings WHERE id = @id');

    // Delete image file from disk
    if (imageFilename) {
      const filePath = path.join(__dirname, '..', 'uploads', imageFilename);
      fs.unlink(filePath, () => {});
    }

    return res.json({ success: true, message: 'Listing deleted successfully.' });
  } catch (err) {
    console.error('remove error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete listing.' });
  }
}

// ─────────────────────────────────────────────
// Helper: Bind all listing fields to a SQL request
// ─────────────────────────────────────────────
function bindListingParams(request, body, sql) {
  const bit = (val) => (val === 'true' || val === true || val === '1' || val === 1) ? 1 : 0;
  const nullableDecimal = (val) => (val === '' || val == null) ? null : parseFloat(val);
  const nullableInt = (val) => (val === '' || val == null) ? null : parseInt(val);
  const nullableDate = (val) => (val === '' || val == null) ? null : val;

  request.input('name', sql.NVarChar(200), body.name || '');
  request.input('description', sql.NVarChar(sql.MAX), body.description || '');
  request.input('address', sql.NVarChar(500), body.address || '');
  request.input('monthly_rent', sql.Decimal(10, 2), parseFloat(body.monthly_rent) || 0);
  request.input('security_deposit', sql.Decimal(10, 2), nullableDecimal(body.security_deposit));
  request.input('advance_payment', sql.Decimal(10, 2), nullableDecimal(body.advance_payment));
  request.input('water_included', sql.Bit, bit(body.water_included));
  request.input('electricity_included', sql.Bit, bit(body.electricity_included));
  request.input('wifi_included', sql.Bit, bit(body.wifi_included));
  request.input('additional_fees', sql.NVarChar(sql.MAX), body.additional_fees || '');
  request.input('room_type', sql.NVarChar(50), body.room_type || 'Solo Room');
  request.input('occupants_allowed', sql.Int, nullableInt(body.occupants_allowed));
  request.input('room_size', sql.NVarChar(100), body.room_size || '');
  request.input('available_rooms', sql.Int, nullableInt(body.available_rooms));
  request.input('available_beds', sql.Int, nullableInt(body.available_beds));
  request.input('amenity_wifi', sql.Bit, bit(body.amenity_wifi));
  request.input('amenity_aircon', sql.Bit, bit(body.amenity_aircon));
  request.input('amenity_electric_fan', sql.Bit, bit(body.amenity_electric_fan));
  request.input('amenity_private_cr', sql.Bit, bit(body.amenity_private_cr));
  request.input('amenity_shared_cr', sql.Bit, bit(body.amenity_shared_cr));
  request.input('amenity_kitchen', sql.Bit, bit(body.amenity_kitchen));
  request.input('amenity_laundry', sql.Bit, bit(body.amenity_laundry));
  request.input('amenity_parking', sql.Bit, bit(body.amenity_parking));
  request.input('amenity_study_area', sql.Bit, bit(body.amenity_study_area));
  request.input('amenity_cctv', sql.Bit, bit(body.amenity_cctv));
  request.input('amenity_security_guard', sql.Bit, bit(body.amenity_security_guard));
  request.input('amenity_water_supply', sql.Bit, bit(body.amenity_water_supply));
  request.input('rule_curfew', sql.Bit, bit(body.rule_curfew));
  request.input('rule_visitors_allowed', sql.Bit, bit(body.rule_visitors_allowed));
  request.input('rule_cooking_allowed', sql.Bit, bit(body.rule_cooking_allowed));
  request.input('rule_drinking_allowed', sql.Bit, bit(body.rule_drinking_allowed));
  request.input('rule_smoking_allowed', sql.Bit, bit(body.rule_smoking_allowed));
  request.input('rule_pets_allowed', sql.Bit, bit(body.rule_pets_allowed));
  request.input('rule_male_only', sql.Bit, bit(body.rule_male_only));
  request.input('rule_female_only', sql.Bit, bit(body.rule_female_only));
  request.input('rule_students_only', sql.Bit, bit(body.rule_students_only));
  request.input('rule_working_professionals_only', sql.Bit, bit(body.rule_working_professionals_only));
  request.input('availability_status', sql.NVarChar(20), body.availability_status || 'Available');
  request.input('date_available', sql.Date, nullableDate(body.date_available));
  request.input('owner_name', sql.NVarChar(200), body.owner_name || '');
  request.input('contact_number', sql.NVarChar(50), body.contact_number || '');
}

module.exports = { getAll, getById, create, update, remove };
