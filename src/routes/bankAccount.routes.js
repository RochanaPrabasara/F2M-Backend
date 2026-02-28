const express = require('express');
const { auth, requireRole } = require('../middleware/auth.middleware');
const {
  getMyAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setPrimary,
  getFarmerAccounts
} = require('../controllers/bankAccount.controller');

const router = express.Router();

// ─── Farmer-only routes ────────────────────────────────────────
router.get('/', auth, requireRole('farmer'), getMyAccounts);
router.post('/', auth, requireRole('farmer'), createAccount);
router.patch('/:id', auth, requireRole('farmer'), updateAccount);
router.delete('/:id', auth, requireRole('farmer'), deleteAccount);
router.patch('/:id/primary', auth, requireRole('farmer'), setPrimary);

// ─── Buyer-accessible route (public for authenticated buyers) ──
router.get('/farmer/:farmerId', auth, requireRole('buyer'), getFarmerAccounts);

module.exports = router;