const express = require("express");
const router = express.Router();

const { createMentorProfile, getMentorProfile, searchMentors, getWallet, getEarnings, getTransactions, getPopularSkills, uploadMentorProfileImage, requestPayout } = require("../controllers/mentorController");
const { protect, mentorOnly } = require("../middlewares/authMiddleware");
const { getMentorTest, submitMentorTest } = require("../controllers/mentorTestController");
const { getAvailableSlots } = require("../controllers/mentorSlots.controller");
const upload = require("../middlewares/upload.middleware");

router.post(
  "/profile",
  protect,
  mentorOnly,
  createMentorProfile
);
router.post(
  "/profile/image",
  protect,
  mentorOnly,
  upload.single('profileImage'),
  uploadMentorProfileImage
);
router.get("/profile", protect, mentorOnly, getMentorProfile);
router.get("/search", searchMentors);

router.get(
  "/test",
  protect,
  mentorOnly,
  getMentorTest
);
router.post(
  "/test/submit",
  protect,
  mentorOnly,
  submitMentorTest
);
router.get("/wallet", protect, mentorOnly, getWallet);
router.post("/wallet/withdraw", protect, mentorOnly, requestPayout);
router.get("/earnings", protect, mentorOnly, getEarnings);
router.get("/transactions", protect, mentorOnly, getTransactions);
router.get("/skills/popular", getPopularSkills);
router.get("/:mentorId/slots", getAvailableSlots);


module.exports = router;
