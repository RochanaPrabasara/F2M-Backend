// src/controllers/order.controller.js
const Order = require('../models/Order');
const Listing = require('../models/Listings');
const User = require('../models/User');
const { Op } = require('sequelize');
const emailService = require('../services/email.service');

module.exports = {
  // ── Buyer: Create new order ─────────────────────────────────────────────────
  createOrder: async (req, res) => {
    try {
      const buyerId = req.user.id;
      const { listingId, quantity, location, notes, totalPrice } = req.body;

      const listing = await Listing.findByPk(listingId, {
        include: [{ model: User, as: 'farmer', attributes: ['id', 'fullName', 'email'] }],
      });

      if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

      if (quantity > listing.quantity) {
        return res.status(400).json({ success: false, message: 'Not enough quantity available' });
      }

      const order = await Order.create({
        buyerId,
        listingId,
        quantity,
        totalPrice,
        location,
        notes,
        status: 'payment_pending',
      });

      // Fetch full order with all relations including emails
      const fullOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: Listing,
            attributes: ['id', 'name', 'price', 'unit', 'image', 'quantity'],
            include: [{ model: User, as: 'farmer', attributes: ['id', 'fullName', 'email'] }],
          },
          { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
        ],
      });

      const orderData = {
        id: fullOrder.id,
        quantity: fullOrder.quantity,
        totalPrice: fullOrder.totalPrice,
        location: fullOrder.location,
        notes: fullOrder.notes,
        status: fullOrder.status,
        createdAt: fullOrder.createdAt,
        buyerId: fullOrder.buyerId,
        listingId: fullOrder.listingId,
        Listing: {
          id: fullOrder.Listing.id,
          name: fullOrder.Listing.name,
          price: fullOrder.Listing.price,
          unit: fullOrder.Listing.unit,
          image: fullOrder.Listing.image,
          quantity: fullOrder.Listing.quantity,
          farmer: {
            id: fullOrder.Listing.farmer.id,
            fullName: fullOrder.Listing.farmer.fullName,
          },
        },
        buyer: {
          id: fullOrder.buyer.id,
          fullName: fullOrder.buyer.fullName,
        },
        buyerName: fullOrder.buyer.fullName,
        cropName: fullOrder.Listing.name,
        unit: fullOrder.Listing.unit,
        paymentProof: null,
      };

      // ── Socket: notify farmer in real-time ──────────────────────────────────
      const io = req.app.get('io');
      io.to(`user_${listing.farmer.id}`).emit('new-order', orderData);
      console.log(`[Order] Emitted new-order to farmer room: user_${listing.farmer.id}`);

      // ── Emails: fire-and-forget, never block the response ──────────────────
      const emailOrderPayload = {
        id: fullOrder.id,
        cropName: fullOrder.Listing.name,
        quantity: fullOrder.quantity,
        unit: fullOrder.Listing.unit,
        totalPrice: fullOrder.totalPrice,
        location: fullOrder.location,
        createdAt: fullOrder.createdAt,
      };

      // Email to farmer
      emailService.sendNewOrderToFarmer({
        farmerEmail: fullOrder.Listing.farmer.email,
        farmerName:  fullOrder.Listing.farmer.fullName,
        buyerName:   fullOrder.buyer.fullName,
        order:       emailOrderPayload,
      });

      // Email to buyer
      emailService.sendOrderConfirmationToBuyer({
        buyerEmail:  fullOrder.buyer.email,
        buyerName:   fullOrder.buyer.fullName,
        farmerName:  fullOrder.Listing.farmer.fullName,
        order:       emailOrderPayload,
      });

      res.status(201).json({ success: true, order });
    } catch (err) {
      console.error('createOrder error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ── Buyer: Get my orders ────────────────────────────────────────────────────
  getMyOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({
        where: { buyerId: req.user.id },
        include: [
          {
            model: Listing,
            attributes: ['id', 'name', 'price', 'unit', 'image', 'quantity'],
            include: [{ model: User, as: 'farmer', attributes: ['id', 'fullName'] }],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      const formattedOrders = orders.map(order => ({
        id: order.id,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        location: order.location,
        notes: order.notes,
        status: order.status,
        createdAt: order.createdAt,
        buyerId: order.buyerId,
        listingId: order.listingId,
        farmerId: order.Listing?.farmer?.id || null,
        Listing: order.Listing,
        farmerName: order.Listing?.farmer?.fullName || null,
        cropName: order.Listing?.name || 'Crop Order',
        unit: order.Listing?.unit || 'units',
        paymentProof: order.paymentProofImage ? {
          imageUrl: order.paymentProofImage,
          amount: Number(order.paymentAmount) || 0,
          referenceNumber: order.paymentReference || undefined,
          uploadedAt: order.paymentUploadedAt || new Date().toISOString(),
        } : null,
      }));

      res.json({ success: true, orders: formattedOrders });
    } catch (err) {
      console.error('getMyOrders error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ── Buyer: Upload payment proof ─────────────────────────────────────────────
  uploadPaymentProof: async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, reference, image } = req.body;

      const order = await Order.findByPk(id, {
        include: [{
          model: Listing,
          include: [{ model: User, as: 'farmer', attributes: ['id', 'fullName', 'email'] }],
        },
        { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] }],
      });

      if (!order || order.buyerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      if (!['pending', 'payment_pending'].includes(order.status)) {
        return res.status(400).json({ success: false, message: 'Cannot upload proof now' });
      }

      order.paymentProofImage = image;
      order.paymentAmount = amount;
      order.paymentReference = reference;
      order.paymentUploadedAt = new Date();
      order.status = 'payment_uploaded';
      await order.save();

      // ── Socket ──────────────────────────────────────────────────────────────
      const io = req.app.get('io');
      io.to(`user_${order.Listing.farmer.id}`).emit('payment-proof-uploaded', {
        orderId: order.id,
        cropName: order.Listing.name,
        amount: Number(amount),
        reference: reference || undefined,
        proofImage: image,
        uploadedAt: order.paymentUploadedAt.toISOString(),
      });

      // ── Email to farmer ─────────────────────────────────────────────────────
      emailService.sendPaymentProofToFarmer({
        farmerEmail: order.Listing.farmer.email,
        farmerName:  order.Listing.farmer.fullName,
        buyerName:   order.buyer.fullName,
        order: {
          id: order.id,
          cropName: order.Listing.name,
          quantity: order.quantity,
          unit: order.Listing.unit,
          totalPrice: order.totalPrice,
          location: order.location,
          createdAt: order.createdAt,
        },
      });

      res.json({ success: true, message: 'Proof uploaded' });
    } catch (err) {
      console.error('uploadPaymentProof error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ── Farmer: Get my incoming orders ──────────────────────────────────────────
  getFarmerOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({
        include: [
          {
            model: Listing,
            where: { farmerId: req.user.id },
            attributes: ['id', 'name', 'price', 'unit', 'image', 'quantity'],
          },
          { model: User, as: 'buyer', attributes: ['id', 'fullName'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      const formattedOrders = orders.map(order => ({
        id: order.id,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        location: order.location,
        notes: order.notes,
        status: order.status,
        createdAt: order.createdAt,
        buyerId: order.buyerId,
        listingId: order.listingId,
        Listing: order.Listing,
        buyer: order.buyer,
        buyerName: order.buyer?.fullName || 'Buyer',
        cropName: order.Listing?.name || 'Crop Order',
        unit: order.Listing?.unit || 'units',
        paymentProof: order.paymentProofImage ? {
          imageUrl: order.paymentProofImage,
          amount: Number(order.paymentAmount) || 0,
          referenceNumber: order.paymentReference || undefined,
          uploadedAt: order.paymentUploadedAt || new Date().toISOString(),
        } : null,
      }));

      res.json({ success: true, orders: formattedOrders });
    } catch (err) {
      console.error('getFarmerOrders error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ── Farmer: Confirm payment ─────────────────────────────────────────────────
  confirmPayment: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id, {
        include: [
          {
            model: Listing,
            include: [{ model: User, as: 'farmer', attributes: ['id', 'fullName', 'email'] }],
          },
          { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
        ],
      });

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (order.Listing.farmerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not your order' });
      }

      if (order.status !== 'payment_uploaded') {
        return res.status(400).json({ success: false, message: 'Cannot confirm now' });
      }

      order.status = 'confirmed';
      await order.save();

      // ── Socket ──────────────────────────────────────────────────────────────
      const io = req.app.get('io');
      io.to(`user_${order.buyerId}`).emit('order-confirmed', {
        orderId: order.id,
        cropName: order.Listing.name,
      });

      // ── Email to buyer ──────────────────────────────────────────────────────
      emailService.sendPaymentConfirmedToBuyer({
        buyerEmail:  order.buyer.email,
        buyerName:   order.buyer.fullName,
        farmerName:  order.Listing.farmer.fullName,
        order: {
          id: order.id,
          cropName: order.Listing.name,
          quantity: order.quantity,
          unit: order.Listing.unit,
          totalPrice: order.totalPrice,
          location: order.location,
          createdAt: order.createdAt,
        },
      });

      res.json({ success: true, message: 'Payment confirmed' });
    } catch (err) {
      console.error('confirmPayment error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ── Farmer: Mark as completed ───────────────────────────────────────────────
  completeOrder: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findByPk(id, {
        include: [
          {
            model: Listing,
            include: [{ model: User, as: 'farmer', attributes: ['id', 'fullName', 'email'] }],
          },
          { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email'] },
        ],
      });

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (order.Listing.farmerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not your order' });
      }

      if (order.status !== 'confirmed') {
        return res.status(400).json({ success: false, message: 'Cannot complete now' });
      }

      order.status = 'completed';
      await order.save();

      // ── Socket ──────────────────────────────────────────────────────────────
      const io = req.app.get('io');
      io.to(`user_${order.buyerId}`).emit('order-completed', {
        orderId: order.id,
        cropName: order.Listing.name,
      });

      const emailOrderPayload = {
        id: order.id,
        cropName: order.Listing.name,
        quantity: order.quantity,
        unit: order.Listing.unit,
        totalPrice: order.totalPrice,
        location: order.location,
        createdAt: order.createdAt,
      };

      // ── Emails to both parties ──────────────────────────────────────────────
      emailService.sendOrderCompletedToBuyer({
        buyerEmail:  order.buyer.email,
        buyerName:   order.buyer.fullName,
        farmerName:  order.Listing.farmer.fullName,
        order:       emailOrderPayload,
      });

      emailService.sendOrderCompletedToFarmer({
        farmerEmail: order.Listing.farmer.email,
        farmerName:  order.Listing.farmer.fullName,
        buyerName:   order.buyer.fullName,
        order:       emailOrderPayload,
      });

      res.json({ success: true, message: 'Order completed' });
    } catch (err) {
      console.error('completeOrder error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};