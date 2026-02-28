// src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = async (req, res) => {
  try {
    const { fullName, phone, email, password, confirmPassword, role, district } = req.body;

    if (!fullName || !phone || !email || !password || !role || !district) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    // Create user (password will be hashed via hook)
    const user = await User.create({
      fullName,
      phone,
      email,
      password,           // plain → hook hashes it
      role,               // 'farmer' or 'buyer'
      district
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password: _, ...userData } = user.toJSON();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password
    const { password: _, ...userData } = user.toJSON();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, district, bio } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (district) user.district = district;
    if (bio !== undefined) user.bio = bio;  // we'll add bio field

    await user.save();

    const { password: _, ...updated } = user.toJSON();
    return res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    const { avatar } = req.body; // Expecting base64 string: data:image/...;base64,...

    if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('data:image')) {
      return res.status(400).json({ success: false, message: 'Invalid or missing image data' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.avatar = avatar; // Save base64 directly (you can optimize later)
    await user.save();

    return res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    // req.user comes from auth middleware (JWT verified)
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }, // never send password
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};