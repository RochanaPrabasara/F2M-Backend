// src/routes/forecast.routes.js
const express = require('express');
const {
  predictPrices,
  getCommodities,
  getRegions,
} = require('../controllers/forecast.controller');

const router = express.Router();

router.post('/predict', predictPrices);
router.get('/commodities', getCommodities);
router.get('/regions', getRegions);

module.exports = router;