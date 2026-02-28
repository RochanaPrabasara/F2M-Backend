// src/routes/message.routes.js
const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const {
  getConversations,
  getMessages,
  markRead,
  deleteConversation
} = require('../controllers/message.controller');

const router = express.Router();

// Get all conversations for current user (sidebar list)
router.get('/conversations', auth, getConversations);

router.delete('/conversation/:userId', auth, deleteConversation);

// Get message history between current user and another user
router.get('/:userId', auth, getMessages);

// Mark all messages from a user as read
router.patch('/:userId/read', auth, markRead);

module.exports = router;