// src/models/Message.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    // No REFERENCES constraint — avoids table name case mismatch with PostgreSQL
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  conversationId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['senderId'] },
    { fields: ['receiverId'] },
    { fields: ['createdAt'] },
  ],
});

// Helper: deterministic conversation ID regardless of who initiates
Message.getConversationId = (userIdA, userIdB) => {
  return [userIdA, userIdB].sort().join('_');
};

module.exports = Message;