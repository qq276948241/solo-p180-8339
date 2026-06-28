const express = require('express');
const { readJSON, writeJSON } = require('../utils/store');
const { authMiddleware, adminMiddleware } = require('./auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const seatConfig = readJSON('seats.json', { zones: [], seats: [], timeSlots: [] });
  res.json({ success: true, data: seatConfig });
});

router.put('/', authMiddleware, adminMiddleware, (req, res) => {
  const { zones, seats, timeSlots } = req.body;
  const config = {
    zones: zones || [],
    seats: seats || [],
    timeSlots: timeSlots || []
  };
  writeJSON('seats.json', config);
  res.json({ success: true, data: config });
});

router.get('/availability', authMiddleware, (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, message: '请指定日期' });
  }

  const seatConfig = readJSON('seats.json', { zones: [], seats: [], timeSlots: [] });
  const bookings = readJSON('bookings.json', []);

  const activeBookings = bookings.filter(b => b.date === date && b.status === 'active');

  const availability = {};
  seatConfig.seats.forEach(seat => {
    availability[seat.id] = {};
    seatConfig.timeSlots.forEach(slot => {
      const booking = activeBookings.find(b => b.seatId === seat.id && b.timeSlotId === slot.id);
      availability[seat.id][slot.id] = booking
        ? { available: false, bookedBy: booking.userId, bookingId: booking.id }
        : { available: true };
    });
  });

  res.json({
    success: true,
    data: {
      seatConfig,
      availability,
      activeBookings
    }
  });
});

module.exports = router;
