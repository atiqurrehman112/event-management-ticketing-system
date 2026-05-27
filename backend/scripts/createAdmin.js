const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config();

const createAdmin = async () => {
  await connectDB(process.env.MONGO_URI);

  const name = process.env.ADMIN_NAME || 'EventHub Admin';
  const email = process.env.ADMIN_EMAIL || 'admin@eventhub.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.password = password;
    existingAdmin.role = 'admin';
    await existingAdmin.save();
    console.log(`Admin user updated: ${email}`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin user created: ${email}`);
  }

  process.exit(0);
};

createAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
