const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    profileImage: {
      type: String,
      default: ''
    },

    interests: {
      type: [String],
      default: []
    },

    goals: {
      type: String
    },

    education: {
      type: String
    },

    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"]
    },

    preferredAvailability: {
      type: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        startTime: String,
        endTime: String,
        enabled: { type: Boolean, default: true }
      }],
      default: [
        { day: 'Monday', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'Tuesday', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'Wednesday', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'Thursday', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'Friday', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'Saturday', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'Sunday', startTime: '09:00', endTime: '17:00', enabled: true }
      ]
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    }
  },
  { timestamps: true }
);

// Geo index
candidateSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Candidate", candidateSchema);
