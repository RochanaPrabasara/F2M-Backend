const express = require('express');
const { auth, requireRole } = require('../middleware/auth.middleware');
const {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  updateListing,
  deleteListing
} = require('../controllers/listing.controller');

const router = express.Router();

router.get('/mine', auth, requireRole('farmer'), getMyListings);
router.post('/', auth, requireRole('farmer'), createListing);
router.get('/', getListings);
router.get('/:id', getListingById);
router.patch('/:id', auth, requireRole('farmer'), updateListing);
router.delete('/:id', auth, requireRole('farmer'), deleteListing);


module.exports = router;