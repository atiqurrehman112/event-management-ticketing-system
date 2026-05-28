const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const files = [
  'backend/server.js',
  'backend/config/db.js',
  'backend/middleware/authMiddleware.js',
  'backend/middleware/uploadMiddleware.js',
  'backend/models/User.js',
  'backend/models/Event.js',
  'backend/models/Booking.js',
  'backend/routes/authRoutes.js',
  'backend/routes/eventRoutes.js',
  'backend/routes/bookingRoutes.js',
  'backend/scripts/createAdmin.js',
  'backend/tests/api.test.js',
  'frontend/assets/js/api.js',
  'frontend/assets/js/auth.js',
  'frontend/assets/js/events.js',
  'frontend/assets/js/tickets.js',
  'frontend/assets/js/admin.js'
];

for (const file of files) {
  const absolutePath = path.join(root, file);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Missing build input: ${file}`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, ['--check', absolutePath], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('EventHub build check passed.');
