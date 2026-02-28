// src/models/Order.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Listing = require('./Listings');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  listingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'listings', key: 'id' },
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  location: {  // ← just "location" as requested
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  notes: {  // ← renamed from deliveryNotes
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'payment_pending',
      'payment_uploaded',
      'confirmed',
      'completed',
      'cancelled'
    ),
    defaultValue: 'pending',
  },
  paymentProofImage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  paymentReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  paymentUploadedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  timestamps: true,
});

Order.belongsTo(User, { as: 'buyer', foreignKey: 'buyerId' });
Order.belongsTo(Listing, { foreignKey: 'listingId' });

module.exports = Order;