const Mentor = require("../models/Mentor");
const generateMentorTest = require("../services/geminiTest.service");
const MentorTestSession = require("../models/MentorTestSession");
const { MAX_TEST_ATTEMPTS } = require("../config/constants");

exports.getMentorTest = async (req, res, next) => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user._id });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor profile not found"
      });
    }

    if (mentor.verified) {
      return res.status(400).json({
        success: false,
        message: "Mentor already verified"
      });
    }

    if (mentor.verification.attempts >= MAX_TEST_ATTEMPTS) {
      return res.status(403).json({
        success: false,
        message: "Maximum test attempts exceeded. You have used all 3 attempts.",
        attempts: mentor.verification.attempts,
        maxAttempts: MAX_TEST_ATTEMPTS,
        attemptsRemaining: 0
      });
    }

    const existingSession = await MentorTestSession.findOne({ mentorId: mentor._id });
    
    let test;
    let usedFallback = false;

    if (existingSession && existingSession.test && existingSession.test.mcq?.length >= 5) {
      test = existingSession.test;
      usedFallback = test.isFallback || false;
      console.log("♻️ Using cached test session");
    } else {
      try {
        test = await generateMentorTest({
          skills: mentor.skills,
          title: mentor.title,
          bio: mentor.bio
        });
        usedFallback = test.isFallback || false;
      } catch (geminiErr) {
        console.warn("Gemini test generation failed:", geminiErr.message);
        
        if (existingSession?.test?.mcq?.length >= 5) {
          test = existingSession.test;
          usedFallback = test.isFallback || true;
        } else {
          test = await generateMentorTest({
            skills: mentor.skills,
            title: mentor.title,
            bio: mentor.bio
          });
          usedFallback = true;
        }
      }

      await MentorTestSession.findOneAndUpdate(
        { mentorId: mentor._id },
        { test },
        { upsert: true }
      );
    }

    const safeMCQ = test.mcq.map(({ correctIndex, ...q }) => q);

    res.status(200).json({
      success: true,
      test: {
        mcq: safeMCQ,
        timeLimit: 600,
        skills: mentor.skills,
        usedFallback
      },
      attempts: mentor.verification.attempts,
      maxAttempts: MAX_TEST_ATTEMPTS
    });
  } catch (error) {
    next(error);
  }
};

exports.submitMentorTest = async (req, res, next) => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user._id });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor profile not found"
      });
    }

    const session = await MentorTestSession.findOne({
      mentorId: mentor._id
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Test session expired. Please retake the test."
      });
    }

    const { mcqAnswers } = req.body;
    const storedTest = session.test;

    let correct = 0;
    storedTest.mcq.forEach(q => {
      const ans = mcqAnswers.find(a => a.id === q.id);
      if (ans && ans.answer === q.correctIndex) {
        correct++;
      }
    });

    const finalScore = (correct / storedTest.mcq.length) * 100;

    mentor.verification.attempts += 1;
    mentor.verification.score = finalScore;
    mentor.verification.lastAttemptAt = new Date();

    if (finalScore >= 70) {
      mentor.verified = true;
      mentor.verification.passed = true;
      // Delete session — no more testing needed once verified
      await MentorTestSession.deleteOne({ mentorId: mentor._id });
    } else {
      mentor.verification.passed = false;
      // Delete session so next retake generates fresh questions
      await MentorTestSession.deleteOne({ mentorId: mentor._id });
    }

    await mentor.save();

    res.status(200).json({
      success: true,
      verified: mentor.verified,
      score: Math.round(finalScore),
      attempts: mentor.verification.attempts,
      maxAttempts: MAX_TEST_ATTEMPTS,
      passedSkills: storedTest.mcq.filter((q, i) => {
        const ans = mcqAnswers.find(a => a.id === q.id);
        return ans && ans.answer === q.correctIndex;
      }).map(q => q.skill),
      message: mentor.verified
        ? "Mentor verified successfully"
        : `Test failed. You have ${MAX_TEST_ATTEMPTS - mentor.verification.attempts} attempt(s) remaining.`
    });
  } catch (error) {
    next(error);
  }
};