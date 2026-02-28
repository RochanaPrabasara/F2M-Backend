// src/routes/dashboard.routes.js
const express = require('express');
const { auth, requireRole } = require('../middleware/auth.middleware');
const { getFarmerStats, getBuyerStats } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/farmer', auth, requireRole('farmer'), getFarmerStats);
router.get('/buyer', auth, requireRole('buyer'), getBuyerStats);

module.exports = router;