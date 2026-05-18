const Candidate = require("../models/candidate");
const User = require("../models/User");

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// CREATE or UPDATE candidate profile
exports.createCandidateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, experience, ...candidateData } = req.body;

    // Update User model if name is provided
    if (name) {
      await User.findByIdAndUpdate(userId, { name });
    }

    // Check if profile already exists
    const existingProfile = await Candidate.findOne({ userId });
    if (existingProfile) {
      // UPDATE existing profile
      Object.assign(existingProfile, candidateData);
      
      // Update preferred availability if provided
      if (candidateData.preferredAvailability) {
        existingProfile.preferredAvailability = candidateData.preferredAvailability;
      }
      
      await existingProfile.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        candidate: existingProfile
      });
    }

    // Set default preferred availability
    const defaultAvailability = DAY_OPTIONS.map(day => ({
      day,
      startTime: '09:00',
      endTime: '17:00',
      enabled: day !== 'Sunday'
    }));

    const candidate = await Candidate.create({
      userId,
      ...candidateData,
      preferredAvailability: candidateData.preferredAvailability || defaultAvailability
    });

    res.status(201).json({
      success: true,
      message: "Profile created successfully",
      candidate
    });
  } catch (error) {
    next(error);
  }
};

// GET candidate profile (with name & email)
exports.getCandidateProfile = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id })
      .populate("userId", "name email");

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate profile not found"
      });
    }

    res.status(200).json({
      success: true,
      candidate
    });
  } catch (error) {
    next(error);
  }
};

// Upload candidate profile image
exports.uploadCandidateProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = `/uploads/profile/${req.file.filename}`;
    
    const candidate = await Candidate.findOneAndUpdate(
      { userId: req.user._id },
      { profileImage: fileUrl },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile image uploaded",
      profileImage: fileUrl,
      candidate
    });
  } catch (error) {
    next(error);
  }
};
