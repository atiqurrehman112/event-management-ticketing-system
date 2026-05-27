const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

const uploadsDir = path.join(__dirname, 'uploads', 'events');
fs.mkdirSync(uploadsDir, { recursive: true });

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null') return callback(null, true);

    const isAllowedOrigin = allowedOrigins.includes(origin);
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isAllowedOrigin || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EventHub API' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin is not allowed by CORS' });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource id' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: Object.values(err.errors).map((error) => error.message).join(', ')
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with this value already exists' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Server error'
  });
});

const startServer = async () => {
  await connectDB(process.env.MONGO_URI);
  const port = process.env.PORT || 5000;
  return app.listen(port, () => {
    console.log(`EventHub API running on port ${port}`);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };
