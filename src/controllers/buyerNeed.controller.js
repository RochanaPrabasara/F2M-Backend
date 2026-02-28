//buyerNeed.controller.js

const BuyerNeed = require('../models/BuyerNeed');
const { Op } = require('sequelize');
const User = require('../models/User');   // ← ADD THIS LINE

exports.createNeed = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const {
      cropName,
      quantity,
      unit,
      maxPrice,
      location,
      urgency,
      description,
    } = req.body;

    if (!cropName || !quantity || !unit || !maxPrice || !location || !urgency || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const need = await BuyerNeed.create({
      buyerId,
      cropName,
      quantity,
      unit,
      maxPrice,
      location,
      urgency,
      description,
    });

    return res.status(201).json({
      success: true,
      message: 'Request posted successfully',
      need,
    });
  } catch (err) {
    console.error('createNeed error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateNeed = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { id } = req.params;

    const need = await BuyerNeed.findOne({ where: { id, buyerId } });
    if (!need) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const allowed = [
      'cropName',
      'quantity',
      'unit',
      'maxPrice',
      'location',
      'urgency',
      'description',
      'status',
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        need[key] = req.body[key];
      }
    }

    await need.save();

    return res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      need,
    });
  } catch (err) {
    console.error('updateNeed error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getNeeds = async (req, res) => {
  try {
    const { search, urgency } = req.query;

    const where = {
      status: 'open',
    };

    if (urgency && ['low', 'medium', 'high'].includes(urgency)) {
      where.urgency = urgency;
    }

    if (search) {
      where[Op.or] = [
        { cropName: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const needs = await BuyerNeed.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'fullName'],   // ← add this
        }
      ]
    });

    return res.json({ success: true, needs });
  } catch (err) {
    console.error('getNeeds error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyNeeds = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const needs = await BuyerNeed.findAll({
      where: { buyerId },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, needs });
  } catch (err) {
    console.error('getMyNeeds error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteNeed = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { id } = req.params;

    const need = await BuyerNeed.findOne({ where: { id, buyerId } });
    if (!need) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    await need.destroy();

    return res.status(200).json({
      success: true,
      message: 'Request deleted successfully',
    });
  } catch (err) {
    console.error('deleteNeed error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};