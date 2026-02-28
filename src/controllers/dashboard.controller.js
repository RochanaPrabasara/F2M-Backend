// src/controllers/dashboard.controller.js
const Order = require('../models/Order');
const Listing = require('../models/Listings');
const BuyerNeed = require('../models/BuyerNeed');
const User = require('../models/User');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');

// ─── FARMER DASHBOARD STATS ─────────────────────────────────────────────────
// GET /api/dashboard/farmer
exports.getFarmerStats = async (req, res) => {
  try {
    const farmerId = req.user.id;

    // 1. Total revenue from completed orders
    const revenueResult = await Order.findAll({
      attributes: [[fn('SUM', col('Order.totalPrice')), 'total']],
      include: [{
        model: Listing,
        where: { farmerId },
        attributes: [],
        required: true,
      }],
      where: { status: 'completed' },
      raw: true,
    });
    const totalRevenue = parseFloat(revenueResult[0]?.total || 0);

    // 2. Revenue from last month (for trend)
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);

    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0); // last day of previous month
    lastMonthEnd.setHours(23, 59, 59, 999);

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthRevenue = await Order.findAll({
      attributes: [[fn('SUM', col('Order.totalPrice')), 'total']],
      include: [{ model: Listing, where: { farmerId }, attributes: [], required: true }],
      where: { status: 'completed', createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] } },
      raw: true,
    });

    const thisMonthRevenue = await Order.findAll({
      attributes: [[fn('SUM', col('Order.totalPrice')), 'total']],
      include: [{ model: Listing, where: { farmerId }, attributes: [], required: true }],
      where: { status: 'completed', createdAt: { [Op.gte]: thisMonthStart } },
      raw: true,
    });

    const lastMonthRev = parseFloat(lastMonthRevenue[0]?.total || 0);
    const thisMonthRev = parseFloat(thisMonthRevenue[0]?.total || 0);
    const revenueTrend = lastMonthRev > 0
      ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
      : thisMonthRev > 0 ? 100 : 0;

    // 3. Active orders (pending / payment_pending / payment_uploaded / confirmed)
    const activeOrders = await Order.count({
      include: [{ model: Listing, where: { farmerId }, attributes: [], required: true }],
      where: { status: { [Op.in]: ['pending', 'payment_pending', 'payment_uploaded', 'confirmed'] } },
    });

    // Active orders last week vs this week (for trend)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const lastWeekOrders = await Order.count({
      include: [{ model: Listing, where: { farmerId }, attributes: [], required: true }],
      where: { createdAt: { [Op.between]: [twoWeeksAgo, oneWeekAgo] } },
    });
    const thisWeekOrders = await Order.count({
      include: [{ model: Listing, where: { farmerId }, attributes: [], required: true }],
      where: { createdAt: { [Op.gte]: oneWeekAgo } },
    });
    const ordersTrend = lastWeekOrders > 0
      ? Math.round(((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100)
      : thisWeekOrders > 0 ? 100 : 0;

    // 4. Active listings
    const activeListings = await Listing.count({
      where: { farmerId, status: 'available' },
    });

    // Active listings trend (vs last month)
    const lastMonthListings = await Listing.count({
      where: { farmerId, createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] } },
    });
    const thisMonthListings = await Listing.count({
      where: { farmerId, createdAt: { [Op.gte]: thisMonthStart } },
    });
    const listingsTrend = lastMonthListings > 0
      ? Math.round(((thisMonthListings - lastMonthListings) / lastMonthListings) * 100)
      : thisMonthListings > 0 ? 100 : 0;

    // 5. Market trend: avg price of farmer's listings vs last month's avg
    const avgPriceThisMonth = await Listing.findAll({
      attributes: [[fn('AVG', col('price')), 'avg']],
      where: { farmerId, createdAt: { [Op.gte]: thisMonthStart } },
      raw: true,
    });
    const avgPriceLastMonth = await Listing.findAll({
      attributes: [[fn('AVG', col('price')), 'avg']],
      where: { farmerId, createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] } },
      raw: true,
    });
    const thisAvg = parseFloat(avgPriceThisMonth[0]?.avg || 0);
    const lastAvg = parseFloat(avgPriceLastMonth[0]?.avg || 0);
    const marketTrend = lastAvg > 0
      ? Math.round(((thisAvg - lastAvg) / lastAvg) * 100)
      : 0;

    // 6. Recent orders (last 5)
    const recentOrders = await Order.findAll({
      include: [
        {
          model: Listing,
          where: { farmerId },
          attributes: ['name', 'unit'],
          required: true,
        },
        { model: User, as: 'buyer', attributes: ['fullName'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const recentActivity = recentOrders.map(o => ({
      id: o.id,
      type: 'order',
      description: `Order for ${o.Listing?.name} from ${o.buyer?.fullName || 'Buyer'}`,
      amount: o.totalPrice,
      status: o.status,
      date: o.createdAt,
    }));

    res.json({
      success: true,
      stats: {
        totalRevenue,
        revenueTrend,
        activeOrders,
        ordersTrend,
        activeListings,
        listingsTrend,
        marketTrend,
        marketTrendIsPositive: marketTrend >= 0,
      },
      recentActivity,
    });
  } catch (err) {
    console.error('getFarmerStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── BUYER DASHBOARD STATS ───────────────────────────────────────────────────
// GET /api/dashboard/buyer
exports.getBuyerStats = async (req, res) => {
  try {
    const buyerId = req.user.id;

    // 1. Total spent (completed orders)
    const spentResult = await Order.findAll({
      attributes: [[fn('SUM', col('totalPrice')), 'total']],
      where: { buyerId, status: 'completed' },
      raw: true,
    });
    const totalSpent = parseFloat(spentResult[0]?.total || 0);

    // Spent trend: this month vs last month
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    lastMonthStart.setHours(0, 0, 0, 0);
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);
    lastMonthEnd.setHours(23, 59, 59, 999);
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const lastMonthSpent = await Order.findAll({
      attributes: [[fn('SUM', col('totalPrice')), 'total']],
      where: { buyerId, status: 'completed', createdAt: { [Op.between]: [lastMonthStart, lastMonthEnd] } },
      raw: true,
    });
    const thisMonthSpent = await Order.findAll({
      attributes: [[fn('SUM', col('totalPrice')), 'total']],
      where: { buyerId, status: 'completed', createdAt: { [Op.gte]: thisMonthStart } },
      raw: true,
    });
    const lastSpent = parseFloat(lastMonthSpent[0]?.total || 0);
    const thisSpent = parseFloat(thisMonthSpent[0]?.total || 0);
    const spentTrend = lastSpent > 0
      ? Math.round(((thisSpent - lastSpent) / lastSpent) * 100)
      : thisSpent > 0 ? 100 : 0;

    // 2. Active orders
    const activeOrders = await Order.count({
      where: {
        buyerId,
        status: { [Op.in]: ['pending', 'payment_pending', 'payment_uploaded', 'confirmed'] },
      },
    });

    // Active orders trend (this week vs last week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const lastWeekOrders = await Order.count({
      where: { buyerId, createdAt: { [Op.between]: [twoWeeksAgo, oneWeekAgo] } },
    });
    const thisWeekOrders = await Order.count({
      where: { buyerId, createdAt: { [Op.gte]: oneWeekAgo } },
    });
    const ordersTrend = lastWeekOrders > 0
      ? Math.round(((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100)
      : thisWeekOrders > 0 ? 100 : 0;

    // 3. Active posted needs
    const activeNeeds = await BuyerNeed.count({
      where: { buyerId, status: 'open' },
    });

    // 4. Completed orders count (market opportunities proxy)
    const completedOrders = await Order.count({
      where: { buyerId, status: 'completed' },
    });

    // 5. Recent activity (last 5 orders)
    const recentOrders = await Order.findAll({
      where: { buyerId },
      include: [{
        model: Listing,
        attributes: ['name', 'unit'],
        include: [{ model: User, as: 'farmer', attributes: ['fullName'] }],
      }],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const recentActivity = recentOrders.map(o => ({
      id: o.id,
      type: 'order',
      description: `Order for ${o.Listing?.name || 'Crop'} from ${o.Listing?.farmer?.fullName || 'Farmer'}`,
      amount: o.totalPrice,
      status: o.status,
      date: o.createdAt,
    }));

    res.json({
      success: true,
      stats: {
        totalSpent,
        spentTrend,
        spentTrendIsPositive: spentTrend <= 0, // spending less = positive for buyer
        activeOrders,
        ordersTrend,
        activeNeeds,
        completedOrders,
      },
      recentActivity,
    });
  } catch (err) {
    console.error('getBuyerStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};