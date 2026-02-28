// src/controllers/message.controller.js
const { Op, fn, col, literal } = require('sequelize');
const Message = require('../models/Message');
const User = require('../models/User');
const sequelize = require('../config/database');

// GET /api/messages/conversations
// Returns one entry per unique conversation partner, with last message + unread count
exports.getConversations = async (req, res) => {
  try {
    const myId = req.user.id;

    // Get all distinct conversation IDs involving current user
    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ senderId: myId }, { receiverId: myId }],
      },
      attributes: ['conversationId', 'senderId', 'receiverId', 'text', 'read', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Build map: conversationId → { lastMessage, otherId, unreadCount }
    const convMap = new Map();

    for (const msg of messages) {
      const cid = msg.conversationId;
      const otherId = msg.senderId === myId ? msg.receiverId : msg.senderId;

      if (!convMap.has(cid)) {
        // First (most recent) message for this conversation
        convMap.set(cid, {
          conversationId: cid,
          otherId,
          lastMessage: { text: msg.text, createdAt: msg.createdAt },
          unreadCount: 0,
        });
      }

      // Count unread messages sent TO me in this conversation
      if (msg.receiverId === myId && !msg.read) {
        convMap.get(cid).unreadCount += 1;
      }
    }

    // Enrich with other user's profile info
    const otherIds = [...new Set([...convMap.values()].map((c) => c.otherId))];
    const users = await User.findAll({
      where: { id: otherIds },
      attributes: ['id', 'fullName', 'role'],
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const conversations = [...convMap.values()].map((c) => ({
      conversationId: c.conversationId,
      participant: {
        id: c.otherId,
        fullName: userMap[c.otherId]?.fullName || 'Unknown',
        role: userMap[c.otherId]?.role || 'unknown',
      },
      lastMessage: c.lastMessage,
      unreadCount: c.unreadCount,
    }));

    // Sort by most recent last message
    conversations.sort(
      (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    res.json({ success: true, conversations });
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/messages/:userId
// Returns full message history between current user and :userId
exports.getMessages = async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;
    const conversationId = Message.getConversationId(myId, userId);

    // Get other user's info
    const otherUser = await User.findByPk(userId, {
      attributes: ['id', 'fullName', 'role'],
    });

    if (!otherUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const messages = await Message.findAll({
      where: { conversationId },
      attributes: ['id', 'senderId', 'receiverId', 'text', 'read', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    res.json({
      success: true,
      messages,
      participant: {
        id: otherUser.id,
        fullName: otherUser.fullName,
        role: otherUser.role,
      },
    });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/messages/:userId/read
// Marks all messages from :userId to current user as read
exports.markRead = async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;
    const conversationId = Message.getConversationId(myId, userId);

    await Message.update(
      { read: true },
      {
        where: {
          conversationId,
          receiverId: myId,
          read: false,
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/messages/conversation/:userId
// Hard-deletes ALL messages in the conversation between current user and :userId
exports.deleteConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;
    const conversationId = Message.getConversationId(myId, userId);

    const deleted = await Message.destroy({ where: { conversationId } });

    console.log(`[Message] Deleted ${deleted} messages in conversation ${conversationId}`);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('deleteConversation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};