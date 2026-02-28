const BankAccount = require('../models/BankAccount');
const { Op } = require('sequelize');

exports.getMyAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({
      where: { userId: req.user.id },
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']],
    });
    return res.json({ success: true, accounts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { bankName, accountNumber, accountHolderName, branchName } = req.body;

    if (!bankName || !accountNumber || !accountHolderName) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    // If this is first account → make it primary
    const existing = await BankAccount.count({ where: { userId: req.user.id } });
    const isPrimary = existing === 0;

    const account = await BankAccount.create({
      userId: req.user.id,
      bankName,
      accountNumber,
      accountHolderName,
      branchName: branchName || null,
      isPrimary,
    });

    return res.status(201).json({ success: true, account });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const account = await BankAccount.findOne({
      where: { id, userId: req.user.id },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    Object.assign(account, updates);
    await account.save();

    return res.json({ success: true, account });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await BankAccount.findOne({
      where: { id, userId: req.user.id },
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    await account.destroy();
    return res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.setPrimary = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await BankAccount.findOne({
      where: { id, userId: req.user.id },
    });

    if (!target) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Reset all to non-primary
    await BankAccount.update(
      { isPrimary: false },
      { where: { userId: req.user.id } }
    );

    // Set target as primary
    target.isPrimary = true;
    await target.save();

    return res.json({ success: true, account: target });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get public bank accounts of a specific farmer (for buyers)
exports.getFarmerAccounts = async (req, res) => {
  try {
    const { farmerId } = req.params;

    const accounts = await BankAccount.findAll({
      where: { 
        userId: farmerId,
        isActive: true 
      },
      attributes: [
        'id', 'bankName', 'accountNumber', 'accountHolderName', 
        'branchName', 'isPrimary'
      ],
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({ success: true, accounts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};