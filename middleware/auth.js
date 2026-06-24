/* ===================================================
   DormLink — middleware/auth.js
   Protects routes — requires an active landlord session
   =================================================== */

'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.isLoggedIn === true) {
    return next(); // Session is valid — proceed
  }
  // Not authenticated
  return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
}

module.exports = requireAuth;
