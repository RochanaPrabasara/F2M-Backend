// src/routes/auth.routes.js
const express = require('express');
const { signup, login,updateProfile,uploadAvatar,getMe } = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.patch('/profile', auth, updateProfile);
router.post('/avatar', auth, uploadAvatar);
router.get('/me', auth, getMe);  // ← ADD THIS LINE

module.exports = router;