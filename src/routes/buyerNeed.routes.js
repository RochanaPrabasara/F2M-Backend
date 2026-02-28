const express = require('express');
const { auth, requireRole } = require('../middleware/auth.middleware');
const {
  createNeed,
  getNeeds,
  getMyNeeds,
  updateNeed,
  deleteNeed
} = require('../controllers/buyerNeed.controller');

const router = express.Router();

router.post('/', auth, requireRole('buyer'), createNeed);
router.get('/', getNeeds);
router.get('/mine', auth, requireRole('buyer'), getMyNeeds);
router.patch('/:id', auth, requireRole('buyer'), updateNeed);
router.delete('/:id', auth, requireRole('buyer'), deleteNeed);



module.exports = router;