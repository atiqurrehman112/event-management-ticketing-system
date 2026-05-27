const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

const posterPath = (req) => {
  if (!req.file) return undefined;
  return `/uploads/events/${req.file.filename}`;
};

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid event id' });
  }
  next();
};

const eventFields = ['title', 'description', 'category', 'date', 'time', 'venue', 'city', 'price', 'totalTickets'];

const buildEventPayload = (body) => {
  return eventFields.reduce((payload, field) => {
    if (body[field] !== undefined) payload[field] = body[field];
    return payload;
  }, {});
};

router.post('/', protect, adminOnly, upload.single('poster'), async (req, res, next) => {
  try {
    const payload = {
      ...buildEventPayload(req.body),
      poster: posterPath(req) || '',
      organizer: req.user._id
    };

    const event = await Event.create(payload);
    res.status(201).json({ message: 'Event created', event });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { search = '', category = '', city = '' } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) filter.category = { $regex: category, $options: 'i' };
    if (city) filter.city = { $regex: city, $options: 'i' };

    const events = await Event.find(filter).sort({ date: 1 }).populate('organizer', 'name email');
    res.json({ count: events.length, events });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validateId, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateId, protect, adminOnly, upload.single('poster'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const soldTickets = await Booking.aggregate([
      { $match: { event: event._id, status: 'confirmed' } },
      { $group: { _id: '$event', total: { $sum: '$quantity' } } }
    ]);
    const sold = soldTickets[0]?.total || 0;

    eventFields
      .filter((field) => field !== 'totalTickets')
      .forEach((field) => {
        if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    if (req.body.totalTickets !== undefined) {
      const nextTotal = Number(req.body.totalTickets);
      if (Number.isNaN(nextTotal) || nextTotal < sold) {
        return res.status(400).json({ message: `Total tickets cannot be less than sold tickets (${sold})` });
      }
      event.totalTickets = nextTotal;
      event.availableTickets = nextTotal - sold;
    }

    const nextPoster = posterPath(req);
    if (nextPoster) event.poster = nextPoster;

    await event.save();
    res.json({ message: 'Event updated', event });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', validateId, protect, adminOnly, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const activeBookings = await Booking.countDocuments({ event: event._id, status: 'confirmed' });
    if (activeBookings > 0) {
      return res.status(409).json({ message: 'Cannot delete an event with active bookings' });
    }

    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
