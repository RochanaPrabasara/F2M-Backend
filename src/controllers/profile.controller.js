// src/controllers/profile.controller.js
const User = require('../models/User');
const Listing = require('../models/Listings');
const BuyerNeed = require('../models/BuyerNeed');
const Order = require('../models/Order');
const { Op } = require('sequelize');

// GET /api/profiles/farmer/:farmerId
// Viewed by buyers — shows farmer's public info + active listings
exports.getFarmerPublicProfile = async (req, res) => {
  try {
    const { farmerId } = req.params;

    const farmer = await User.findOne({
      where: { id: farmerId, role: 'farmer' },
      attributes: ['id', 'fullName', 'district', 'bio', 'avatar', 'createdAt'],
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    // Get available listings
    const listings = await Listing.findAll({
      where: { farmerId, status: 'available' },
      attributes: ['id', 'name', 'price', 'unit', 'quantity', 'quality', 'image', 'location', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Completed orders count (as a trust signal)
    const completedOrders = await Order.count({
      include: [{
        model: Listing,
        where: { farmerId },
        required: true,
      }],
      where: { status: 'completed' },
    });

    res.json({
      success: true,
      farmer: {
        id: farmer.id,
        fullName: farmer.fullName,
        district: farmer.district,
        bio: farmer.bio,
        avatar: farmer.avatar,
        createdAt: farmer.createdAt,
        completedOrders,
        totalListings: listings.length,
      },
      listings,
    });
  } catch (err) {
    console.error('getFarmerPublicProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/profiles/buyer/:buyerId
// Viewed by farmers — shows buyer's public info + active requests
exports.getBuyerPublicProfile = async (req, res) => {
  try {
    const { buyerId } = req.params;

    const buyer = await User.findOne({
      where: { id: buyerId, role: 'buyer' },
      attributes: ['id', 'fullName', 'district', 'bio', 'avatar', 'createdAt'],
    });

    if (!buyer) {
      return res.status(404).json({ success: false, message: 'Buyer not found' });
    }

    // Get open buyer needs/requests
    const requests = await BuyerNeed.findAll({
      where: { buyerId, status: 'open' },
      attributes: ['id', 'cropName', 'quantity', 'unit', 'maxPrice', 'location', 'description', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Completed orders count
    const completedOrders = await Order.count({
      where: { buyerId, status: 'completed' },
    });

    res.json({
      success: true,
      buyer: {
        id: buyer.id,
        fullName: buyer.fullName,
        district: buyer.district,
        bio: buyer.bio,
        avatar: buyer.avatar,
        createdAt: buyer.createdAt,
        completedOrders,
        totalRequests: requests.length,
      },
      requests,
    });
  } catch (err) {
    console.error('getBuyerPublicProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};