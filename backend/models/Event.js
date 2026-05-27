const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 140
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
      trim: true
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    },
    totalTickets: {
      type: Number,
      required: [true, 'Total tickets are required'],
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Total tickets must be a whole number'
      }
    },
    availableTickets: {
      type: Number,
      required: true,
      min: 0,
      validate: [
        {
          validator: Number.isInteger,
          message: 'Available tickets must be a whole number'
        },
        {
          validator(value) {
            return value <= this.totalTickets;
          },
          message: 'Available tickets cannot exceed total tickets'
        }
      ]
    },
    poster: {
      type: String,
      default: ''
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

eventSchema.pre('validate', function setAvailableTickets(next) {
  if (this.isNew && this.availableTickets === undefined) {
    this.availableTickets = this.totalTickets;
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
