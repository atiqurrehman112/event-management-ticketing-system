const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');

let adminToken;
let userToken;
let eventId;
let bookingId;
let uploadedPosterPath;

test.before(async () => {
  process.env.JWT_SECRET = 'test_secret';
  const testUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/eventhub_test';
  await mongoose.connect(testUri);
  await mongoose.connection.db.dropDatabase();

  await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'admin'
  });
});

test.after(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();

  if (uploadedPosterPath) {
    await fs.unlink(uploadedPosterPath).catch(() => {});
  }
});

test('registers a user and logs in an admin', async () => {
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Jane Buyer', email: 'jane@example.com', password: 'Pass1234' })
    .expect(201);

  assert.equal(registerResponse.body.user.role, 'user');
  userToken = registerResponse.body.token;

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Admin@123' })
    .expect(200);

  assert.equal(loginResponse.body.user.role, 'admin');
  adminToken = loginResponse.body.token;
});

test('admin creates an event and public users can read it', async () => {
  await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Unauthorized Event',
      description: 'This should not be created.',
      category: 'Conference',
      date: '2027-08-20',
      time: '18:30',
      venue: 'Civic Hall',
      city: 'Chicago',
      price: 75,
      totalTickets: 100
    })
    .expect(403);

  const eventResponse = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${adminToken}`)
    .field('title', 'Product Summit')
    .field('description', 'A polished conference for product leaders.')
    .field('category', 'Conference')
    .field('date', '2027-08-20')
    .field('time', '18:30')
    .field('venue', 'Civic Hall')
    .field('city', 'Chicago')
    .field('price', '75')
    .field('totalTickets', '100')
    .attach('poster', Buffer.from('poster-image'), {
      filename: 'poster.png',
      contentType: 'image/png'
    })
    .expect(201);

  eventId = eventResponse.body.event._id;
  uploadedPosterPath = path.join(__dirname, '..', eventResponse.body.event.poster.replace(/^\/+/, ''));
  assert.equal(eventResponse.body.event.availableTickets, 100);
  assert.match(eventResponse.body.event.poster, /^\/uploads\/events\/.+\.png$/);

  const listResponse = await request(app).get('/api/events').expect(200);
  assert.equal(listResponse.body.count, 1);

  const detailsResponse = await request(app).get(`/api/events/${eventId}`).expect(200);
  assert.equal(detailsResponse.body.event.title, 'Product Summit');
});

test('admin updates an event', async () => {
  const response = await request(app)
    .put(`/api/events/${eventId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ price: 95, totalTickets: 120 })
    .expect(200);

  assert.equal(response.body.event.price, 95);
  assert.equal(response.body.event.availableTickets, 120);
});

test('user books, views, and cancels tickets', async () => {
  const bookResponse = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ eventId, quantity: 2 })
    .expect(201);

  bookingId = bookResponse.body.booking._id;
  assert.equal(bookResponse.body.booking.totalAmount, 190);

  const myTicketsResponse = await request(app)
    .get('/api/bookings/mine')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(200);

  assert.equal(myTicketsResponse.body.count, 1);

  const adminBookingsResponse = await request(app)
    .get('/api/bookings/admin')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(adminBookingsResponse.body.count, 1);

  const userCountResponse = await request(app)
    .get('/api/auth/users/count')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(userCountResponse.body.count, 2);

  await request(app)
    .get('/api/bookings/admin')
    .set('Authorization', `Bearer ${userToken}`)
    .expect(403);

  const cancelResponse = await request(app)
    .patch(`/api/bookings/${bookingId}/cancel`)
    .set('Authorization', `Bearer ${userToken}`)
    .expect(200);

  assert.equal(cancelResponse.body.booking.status, 'cancelled');
});

test('admin deletes event after active bookings are gone', async () => {
  await request(app)
    .delete(`/api/events/${eventId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
});
