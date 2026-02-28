// src/routes/order.routes.js
const express = require('express');
const { auth, requireRole } = require('../middleware/auth.middleware');
const {
  createOrder,
  getMyOrders,
  uploadPaymentProof,
  getFarmerOrders,
  confirmPayment,
  completeOrder,
} = require('../controllers/order.controller');

const router = express.Router();

// Buyer routes
router.post('/', auth, requireRole('buyer'), createOrder);
router.get('/my', auth, requireRole('buyer'), getMyOrders);
router.post('/:id/payment-proof', auth, requireRole('buyer'), uploadPaymentProof);

// Farmer routes
router.get('/farmer', auth, requireRole('farmer'), getFarmerOrders);
router.patch('/:id/confirm-payment', auth, requireRole('farmer'), confirmPayment);
router.patch('/:id/complete', auth, requireRole('farmer'), completeOrder);

module.exports = router;