//listing.controller.js

const Listing = require('../models/Listings');
const { Op } = require('sequelize');
const User = require('../models/User');   // ← ADD THIS LINE

exports.createListing = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const {
      name,
      location,
      quantity,
      unit,
      price,
      quality,
      description,
      image,
    } = req.body;

    if (!name || !location || !quantity || !unit || !price || !quality) {
      return res.status(400).json({
        success: false,
        message: 'name, location, quantity, unit, price, and quality are required',
      });
    }

    const listing = await Listing.create({
      farmerId,
      name,
      location,
      quantity,
      unit,
      price,
      quality,
      description: description || '',
      image: image || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      listing,
    });
  } catch (err) {
    console.error('createListing error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { id } = req.params;

    // Only allow updating own listing
    const listing = await Listing.findOne({ where: { id, farmerId } });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Allowed fields for update
    const allowed = [
      'name',
      'location',
      'quantity',
      'unit',
      'price',
      'quality',
      'description',
      'image',
      'status',
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        listing[key] = req.body[key];
      }
    }

    await listing.save();

    return res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      listing,
    });
  } catch (err) {
    console.error('updateListing error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getListings = async (req, res) => {
  try {
    const { search, category, location } = req.query;

    const where = {
      status: 'available',
    };

    if (category) {
      where.name = category;
    }
    if (location) {
      where.location = location;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const listings = await Listing.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'fullName'],   // ← only what we need
        }
      ]
    });

    return res.json({ success: true, listings });
  } catch (err) {
    console.error('getListings error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findByPk(id, {
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'fullName'],
        },
      ],
    });

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    res.json({ success: true, listing });
  } catch (err) {
    console.error('getListingById error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const listings = await Listing.findAll({
      where: { farmerId },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, listings });
  } catch (err) {
    console.error('getMyListings error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { id } = req.params;

    const listing = await Listing.findOne({ where: { id, farmerId } });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    await listing.destroy();

    return res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (err) {
    console.error('deleteListing error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};