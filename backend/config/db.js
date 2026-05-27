const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
  const uri = mongoUri || process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};

module.exports = connectDB;
