const express = require("express");
const router = express.Router();

const {
  createCandidateProfile,
  getCandidateProfile,
  uploadCandidateProfileImage
} = require("../controllers/candidateController");

const { protect, candidateOnly } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload.middleware");

// CREATE candidate profile
router.post(
  "/profile",
  protect,
  candidateOnly,
  createCandidateProfile
);

// Upload candidate profile image
router.post(
  "/profile/image",
  protect,
  candidateOnly,
  upload.single('profileImage'),
  uploadCandidateProfileImage
);

// GET candidate profile
router.get(
  "/profile",
  protect,
  candidateOnly,
  getCandidateProfile
);

module.exports = router;
