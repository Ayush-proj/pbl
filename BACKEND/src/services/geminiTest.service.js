const model = require("./geminiClient");

const generateMentorTest = async (mentorData) => {
  const { skills, title, bio } = mentorData;
  
  const skillsList = skills?.length ? skills.join(", ") : "general programming";
  const roleContext = title || bio || "Software Developer";

  const prompt = `
You are a strict technical interviewer evaluating a mentor applying for the role of "${roleContext}".

The mentor has listed these skills: ${skillsList}

Generate exactly 5 MCQ questions to verify their expertise in these skills.

Rules:
- Questions must be directly related to their skills: ${skillsList}
- Each MCQ must have exactly 4 options labeled A, B, C, D
- Include correctIndex (0=A, 1=B, 2=C, 3=D)
- Medium to hard difficulty level
- Each question should test practical/deep knowledge, not trivial facts
- NO explanations or extra text
- Return ONLY valid JSON with no markdown

JSON format:
{
  "mcq": [
    {
      "id": "q1",
      "skill": "primary skill this question tests",
      "question": "clear technical question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const cleanJSON = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJSON);

    if (!parsed.mcq || !Array.isArray(parsed.mcq) || parsed.mcq.length === 0) {
      throw new Error("Invalid test format from Gemini");
    }

    return { 
      mcq: parsed.mcq.slice(0, 5),
      skillFocus: skills,
      roleContext: roleContext,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Gemini Test Generation Error:", error.message);
    
    if (error.status === 429 || error.message?.includes('rate')) {
      console.log("⚠️ Gemini rate limit hit, using fallback test");
    } else {
      console.warn("⚠️ Gemini failed, using fallback test");
    }
    
    return generateFallbackTest(skillsList, roleContext);
  }
};

function generateFallbackTest(skills, roleContext) {
  const skillLower = skills.toLowerCase();
  
  const fallbackQuestions = [
    {
      id: "q1",
      skill: skills.split(",")[0] || "Programming",
      question: `As a ${roleContext}, which best describes the core principle of your primary skill?`,
      options: [
        "Understanding fundamental concepts and applying them effectively",
        "Memorizing all available documentation",
        "Avoiding any practical implementation",
        "Focusing only on theory without real-world application"
      ],
      correctIndex: 0
    },
    {
      id: "q2",
      skill: skills.split(",")[0] || "Programming",
      question: `When teaching ${skills.split(",")[0] || 'this skill'}, what approach is most effective?`,
      options: [
        "Structured learning with hands-on practice",
        "Reading documentation without any practice",
        "Only watching videos without interaction",
        "Skipping basics and jumping to advanced topics"
      ],
      correctIndex: 0
    },
    {
      id: "q3",
      skill: skills.split(",")[1] || skills.split(",")[0] || "Problem Solving",
      question: `What is the recommended way to handle errors in ${skills.split(",")[1] || 'this area'}?`,
      options: [
        "Systematic debugging and error analysis",
        "Ignoring error messages",
        "Randomly changing code until it works",
        "Deleting the entire project and starting over"
      ],
      correctIndex: 0
    },
    {
      id: "q4",
      skill: skills.split(",")[0] || "Best Practices",
      question: `How should one stay updated with ${skills.split(",")[0] || 'the field'} developments?`,
      options: [
        "Regular practice, community engagement, and continuous learning",
        "Never reading any new material",
        "Only relying on outdated resources",
        "Avoiding all professional networking"
      ],
      correctIndex: 0
    },
    {
      id: "q5",
      skill: skills.split(",")[0] || "Mentorship",
      question: `What quality is most important for a mentor in ${roleContext}?`,
      options: [
        "Ability to explain concepts clearly and patiently",
        "Making students feel confused",
        "Only giving answers without explanations",
        "Being unavailable for questions"
      ],
      correctIndex: 0
    }
  ];

  return {
    mcq: fallbackQuestions,
    skillFocus: skills,
    roleContext: roleContext,
    generatedAt: new Date().toISOString(),
    isFallback: true
  };
}

module.exports = generateMentorTest;