const Mentor = require("../models/Mentor");
const Booking = require("../models/booking");
const Candidate = require("../models/candidate");

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

    console.log('🎯 getAvailableSlots - mentorId:', mentorId);
    console.log('🎯 getAvailableSlots - date:', date);
    console.log('🎯 getAvailableSlots - sessionType:', sessionType);
    console.log('🎯 getAvailableSlots - mentor availability:', JSON.stringify(mentor.availability));

    const slotDuration = sessionType === "demo" ? 15 : 60;
    
    // Parse requested date properly
    const requestedDateStr = date.includes('T') ? date.split('T')[0] : date;
    const requestedDate = new Date(requestedDateStr + 'T12:00:00');
    
    // Get day of week from date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[requestedDate.getDay()];
    
    console.log('🎯 getAvailableSlots - dayName:', dayName);

    // Find mentor's availability for this day
    let mentorDayAvail = mentor.availability?.find(a => a.day === dayName);
    
    // If no availability for this day, create default
    if (!mentorDayAvail) {
      console.log('⚠️ No availability found for', dayName, '- using default');
      mentorDayAvail = {
        day: dayName,
        startTime: '09:00',
        endTime: '17:00',
        enabled: true
      };
    }
    
    // If day is disabled, return empty
    if (mentorDayAvail.enabled === false) {
      return res.json({
        success: true,
        date,
        sessionType,
        day: dayName,
        slots: [],
        message: "Mentor not available on this day. Selected time does not match mentor availability.",
        availability: mentorDayAvail,
        allSlotsCount: 0,
        availableCount: 0
      });
    }

    // Get candidate's availability
    let candidateAvail = null;
    if (req.user) {
      const candidate = await Candidate.findOne({ userId: req.user._id });
      if (candidate?.preferredAvailability?.length) {
        candidateAvail = candidate.preferredAvailability.find(a => a.day === dayName && a.enabled);
      }
    }

    // Determine effective availability window (intersection of mentor and candidate)
    let effectiveStart = mentorDayAvail.startTime;
    let effectiveEnd = mentorDayAvail.endTime;
    
    if (candidateAvail && candidateAvail.startTime && candidateAvail.endTime) {
      // Take the later start time
      effectiveStart = parseTime(candidateAvail.startTime) > parseTime(mentorDayAvail.startTime) 
        ? candidateAvail.startTime 
        : mentorDayAvail.startTime;
      // Take the earlier end time
      effectiveEnd = parseTime(candidateAvail.endTime) < parseTime(mentorDayAvail.endTime) 
        ? candidateAvail.endTime 
        : mentorDayAvail.endTime;
    }

    // Check if there's valid intersection
    if (parseTime(effectiveStart) >= parseTime(effectiveEnd)) {
      return res.json({
        success: true,
        date,
        sessionType,
        day: dayName,
        slots: [],
        message: "No matching future slots available. Selected time does not match mentor availability.",
        availability: mentorDayAvail,
        candidateAvailability: candidateAvail,
        allSlotsCount: 0,
        availableCount: 0
      });
    }

    // Generate slots only within effective availability window
    const slots = [];
    const startTime = parseTime(effectiveStart);
    const endTime = parseTime(effectiveEnd);
    let currentSlot = startTime;

    console.log('🎯 Generating slots from', effectiveStart, 'to', effectiveEnd);

    while (currentSlot + slotDuration <= endTime) {
      slots.push(formatMinutes(currentSlot));
      currentSlot += slotDuration;
    }
    
    console.log('🎯 Generated slots:', slots);

    // Current time in local timezone
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const isToday = requestedDateStr === currentDateStr;
    const isPastDate = new Date(requestedDateStr) < new Date(currentDateStr + 'T00:00:00');

    // Filter: Remove past slots for today, block past dates entirely
    let filteredSlots = slots;
    if (isPastDate) {
      filteredSlots = [];
      console.log('🎯 Blocked past date:', requestedDateStr);
    } else if (isToday) {
      filteredSlots = slots.filter(slot => {
        const slotMinutes = parseTime(slot);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        // Only show slots that are in the future (at least 15 min buffer)
        return slotMinutes > currentMinutes + 15;
      });
      console.log('🎯 Filtered slots (past removed for today):', filteredSlots);
    }
    
    // Fetch existing bookings to exclude already-booked slots
    const bookingDate = new Date(requestedDateStr + 'T00:00:00.000Z');
    const bookings = await Booking.find({
      mentorId,
      date: bookingDate,
      status: { $in: ["pending", "confirmed", "in-progress", "awaiting-payment"] }
    });
    
    console.log('🎯 Existing bookings:', bookings.length);

    // Remove conflicting slots
    const availableSlots = filteredSlots.filter(slot => {
      const slotStart = parseTime(slot);
      const slotEnd = slotStart + slotDuration;

      return !bookings.some(b => {
        const bookedStart = parseTime(b.time);
        const bookedEnd = bookedStart + (b.duration || slotDuration);

        // Check for overlap
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
    });
    
    console.log('🎯 Available slots:', availableSlots);

    // Check if user already has a demo booking with this mentor
    let hasExistingDemo = false;
    let userDemoStatus = null;
    
    if (req.user && sessionType === "demo") {
      const candidate = await Candidate.findOne({ userId: req.user._id });
      
      if (candidate) {
        const existingDemo = await Booking.findOne({
          mentorId,
          candidateId: candidate._id,
          sessionType: "demo",
          status: { $in: ["pending", "confirmed", "awaiting-payment", "in-progress"] }
        });
        
        if (existingDemo) {
          hasExistingDemo = true;
          userDemoStatus = {
            date: existingDemo.date,
            time: existingDemo.time,
            status: existingDemo.status
          };
        }
      }
    }

    // Build message based on state
    let message = null;
    if (availableSlots.length === 0) {
      if (isPastDate) {
        message = "Cannot book past dates. Showing future mentor slots only.";
      } else if (isToday && filteredSlots.length === 0) {
        message = "No active future slots available for today.";
      } else if (candidateAvail && candidateAvail.enabled === false) {
        message = "Selected time does not match your availability preferences.";
      } else if (!mentorDayAvail.enabled) {
        message = "Selected time does not match mentor availability.";
      } else {
        message = filteredSlots.length === 0 ? "No active future slots available" : "This slot is already booked. Please choose another time.";
      }
    }

    res.json({
      success: true,
      date,
      day: dayName,
      sessionType,
      slots: availableSlots,
      availability: mentorDayAvail,
      candidateAvailability: candidateAvail,
      message,
      hasExistingDemo,
      userDemoStatus,
      allSlotsCount: slots.length,
      availableCount: availableSlots.length,
      isToday,
      isPastDate
    });

  } catch (error) {
    console.error('❌ getAvailableSlots error:', error);
    next(error);
  }
};

/* =========================
   HELPER FUNCTIONS
   ========================= */
function parseTime(timeStr) {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function formatMinutes(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}