const { nightsBetween } = require('../utils/dates');

// Stays are [checkIn, checkOut): the check-out day is free for the next guest.
function overlaps(a, b) {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}

function canBook(existing, request) {
  return existing.every(b => !overlaps(b, request));
}

function price(booking, nightlyCents) {
  return nightsBetween(booking.checkIn, booking.checkOut) * nightlyCents;
}

module.exports = { overlaps, canBook, price };
