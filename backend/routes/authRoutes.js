const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';

  if (process.env.NODE_ENV === 'production' && secret === 'dev_secret_change_me') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  return secret;
};

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const sendAuthResponse = (res, user, statusCode = 200) => {
  res.status(statusCode).json({
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

router.post('/register', async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const user = await User.create({ name, email, password, role: 'user' });
    sendAuthResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    sendAuthResponse(res, user);
  } catch (error) {
    next(error);
  }
});

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

router.get('/users/count', protect, adminOnly, async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
