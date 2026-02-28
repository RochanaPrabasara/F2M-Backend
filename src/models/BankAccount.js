const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const BankAccount = sequelize.define('BankAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  accountHolderName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  branchName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  addedDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'bank_accounts',
  timestamps: true,
});

BankAccount.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = BankAccount;