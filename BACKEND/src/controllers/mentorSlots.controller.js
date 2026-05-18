const Mentor = require("../models/Mentor");
const Booking = require("../models/booking");

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const { date, sessionType = "demo" } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found"
      });
    }

    const slotDuration = sessionType === "demo" ? 15 : 60;

    // Get day of week from date
    const requestedDate = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[requestedDate.getDay()];

    // Find mentor's availability for this day
    const dayAvailability = mentor.availability?.find(a => a.day === dayName);

    // If no availability for this day, return empty slots
    if (!dayAvailability) {
      return res.json({
        success: true,
        date,
        sessionType,
        slots: [],
        availability: null
      });
    }

    // Generate slots only within mentor's availability window
    const slots = [];
    const startTime = parseTime(dayAvailability.startTime);
    const endTime = parseTime(dayAvailability.endTime);
    let currentSlot = startTime;

    while (currentSlot + slotDuration <= endTime) {
      slots.push(formatMinutes(currentSlot));
      currentSlot += slotDuration;
    }

    /* Fetch existing bookings to exclude already-booked slots */
    const bookings = await Booking.find({
      mentorId,
      date: new Date(date),
      status: { $in: ["pending", "confirmed", "in-progress"] }
    });

    /* Remove conflicting slots */
    const availableSlots = slots.filter(slot => {
      const slotStart = parseTime(slot);
      const slotEnd = slotStart + slotDuration;

      return !bookings.some(b => {
        const bookedStart = parseTime(b.time);
        const bookedEnd = bookedStart + b.duration;

        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
    });

    res.json({
      success: true,
      date,
      sessionType,
      slots: availableSlots,
      availability: dayAvailability
    });

  } catch (error) {
    next(error);
  }
};

/* =========================
   HELPERS
   ========================= */

function parseTime(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}
