const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/store');
const { authMiddleware, adminMiddleware } = require('./auth');

const router = express.Router();

function getUserBookings(userId, date = null) {
  const bookings = readJSON('bookings.json', []);
  return bookings.filter(b => {
    if (b.userId !== userId) return false;
    if (date && b.date !== date) return false;
    return true;
  });
}

function enrichBookings(bookings) {
  const users = readJSON('users.json', []);
  const seatConfig = readJSON('seats.json', { zones: [], seats: [], timeSlots: [] });

  return bookings.map(b => {
    const user = users.find(u => u.id === b.userId);
    const seat = seatConfig.seats.find(s => s.id === b.seatId);
    const zone = seat ? seatConfig.zones.find(z => z.id === seat.zone) : null;
    const timeSlot = seatConfig.timeSlots.find(t => t.id === b.timeSlotId);

    return {
      ...b,
      userName: user ? user.name : '未知用户',
      seatLabel: seat ? seat.label : b.seatId,
      zoneName: zone ? zone.name : '',
      timeSlotLabel: timeSlot ? timeSlot.label : b.timeSlotId,
      timeSlotStart: timeSlot ? timeSlot.start : '',
      timeSlotEnd: timeSlot ? timeSlot.end : ''
    };
  });
}

router.post('/', authMiddleware, (req, res) => {
  const { seatId, date, timeSlotId } = req.body;

  if (!seatId || !date || !timeSlotId) {
    return res.status(400).json({ success: false, message: '座位、日期、时段均为必填' });
  }

  const seatConfig = readJSON('seats.json', { zones: [], seats: [], timeSlots: [] });
  const seatExists = seatConfig.seats.some(s => s.id === seatId);
  const slotExists = seatConfig.timeSlots.some(t => t.id === timeSlotId);

  if (!seatExists) {
    return res.status(400).json({ success: false, message: '座位不存在' });
  }
  if (!slotExists) {
    return res.status(400).json({ success: false, message: '时段不存在' });
  }

  const bookings = readJSON('bookings.json', []);
  const activeBookings = bookings.filter(b => b.status === 'active');

  const userConflict = activeBookings.find(
    b => b.userId === req.user.id && b.date === date && b.timeSlotId === timeSlotId
  );
  if (userConflict) {
    return res.status(409).json({ success: false, message: '您在该时段已有预约' });
  }

  const seatConflict = activeBookings.find(
    b => b.seatId === seatId && b.date === date && b.timeSlotId === timeSlotId
  );
  if (seatConflict) {
    return res.status(409).json({ success: false, message: '该座位在该时段已被预约' });
  }

  const newBooking = {
    id: uuidv4(),
    userId: req.user.id,
    seatId,
    date,
    timeSlotId,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  writeJSON('bookings.json', bookings);

  const enriched = enrichBookings([newBooking])[0];
  res.json({ success: true, data: enriched });
});

router.get('/mine', authMiddleware, (req, res) => {
  const { date } = req.query;
  let bookings = getUserBookings(req.user.id, date);
  bookings = enrichBookings(bookings).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeSlotId.localeCompare(b.timeSlotId);
  });
  res.json({ success: true, data: bookings });
});

router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
  const { date } = req.query;
  let bookings = readJSON('bookings.json', []);
  if (date) {
    bookings = bookings.filter(b => b.date === date);
  }
  bookings = enrichBookings(bookings).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.timeSlotId.localeCompare(b.timeSlotId);
  });
  res.json({ success: true, data: bookings });
});

router.get('/frequent-seats', authMiddleware, (req, res) => {
  const bookings = readJSON('bookings.json', []);
  const userBookings = bookings.filter(b => b.userId === req.user.id);

  const seatCount = {};
  userBookings.forEach(b => {
    seatCount[b.seatId] = (seatCount[b.seatId] || 0) + 1;
  });

  const frequentSeats = Object.entries(seatCount)
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([seatId, count]) => ({ seatId, count }));

  res.json({ success: true, data: frequentSeats });
});

router.post('/:id/cancel', authMiddleware, (req, res) => {
  const { id } = req.params;
  const bookings = readJSON('bookings.json', []);
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '预约不存在' });
  }

  const booking = bookings[index];

  if (booking.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权取消该预约' });
  }

  if (booking.status !== 'active') {
    return res.status(400).json({ success: false, message: '该预约已被取消' });
  }

  bookings[index].status = 'cancelled';
  bookings[index].cancelledAt = new Date().toISOString();
  bookings[index].cancelledBy = req.user.id;
  writeJSON('bookings.json', bookings);

  res.json({ success: true, data: enrichBookings([bookings[index]])[0] });
});

module.exports = router;
