// Add these routes to your existing auth.routes.js or create a new profile.routes.js
// src/routes/profile.routes.js

const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const {
  getFarmerPublicProfile,
  getBuyerPublicProfile,
} = require('../controllers/profile.controller');

const router = express.Router();

// Public profile endpoints — authenticated but no role restriction
// so both sides can view each other
router.get('/farmer/:farmerId', auth, getFarmerPublicProfile);
router.get('/buyer/:buyerId', auth, getBuyerPublicProfile);

module.exports = router;