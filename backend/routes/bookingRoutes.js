const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const validateId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({ message: 'Invalid booking id' });
  }
  next();
};

router.post('/', protect, async (req, res, next) => {
  try {
    const { eventId, quantity = 1 } = req.body;
    const ticketCount = Number(quantity);

    if (!eventId || !Number.isInteger(ticketCount) || ticketCount < 1) {
      return res.status(400).json({ message: 'Valid eventId and quantity are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    const event = await Event.findOneAndUpdate(
      { _id: eventId, availableTickets: { $gte: ticketCount } },
      { $inc: { availableTickets: -ticketCount } },
      { new: true, runValidators: true }
    );

    if (!event) {
      const eventExists = await Event.exists({ _id: eventId });
      return res.status(eventExists ? 400 : 404).json({
        message: eventExists ? 'Not enough tickets available' : 'Event not found'
      });
    }

    let booking;
    try {
      booking = await Booking.create({
        user: req.user._id,
        event: event._id,
        quantity: ticketCount,
        totalAmount: ticketCount * event.price
      });
    } catch (error) {
      await Event.findByIdAndUpdate(event._id, { $inc: { availableTickets: ticketCount } });
      throw error;
    }

    await booking.populate('event');
    res.status(201).json({ message: 'Ticket booked successfully', booking });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', protect, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('event')
      .sort({ createdAt: -1 });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
});

router.get('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email role')
      .populate('event')
      .sort({ createdAt: -1 });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/cancel', validateId('id'), protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const ownsBooking = booking.user.toString() === req.user._id.toString();
    if (!ownsBooking && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only cancel your own tickets' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    const cancelledBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'confirmed' },
      { $set: { status: 'cancelled' } },
      { new: true }
    ).populate('event');

    if (!cancelledBooking) {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (cancelledBooking.event) {
      await Event.findByIdAndUpdate(cancelledBooking.event._id, {
        $inc: { availableTickets: cancelledBooking.quantity }
      });
      cancelledBooking.event.availableTickets += cancelledBooking.quantity;
    }

    res.json({ message: 'Ticket cancelled', booking: cancelledBooking });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
