const model = require("./geminiClient");

const generateMentorTest = async (mentorData) => {
  const { skills, title, bio } = mentorData;
  
  const skillsList = skills?.length ? skills.slice(0, 5).join(", ") : "general programming";
  const roleContext = title || bio || "Software Developer";

  const prompt = `Generate 5 MCQ for ${roleContext} (skills: ${skillsList}). 

Format: {"mcq":[{"id":"q1","skill":"skillname","question":"?","options":["A","B","C","D"],"correctIndex":0}]}

Rules: 4 options each, correctIndex 0-3, medium difficulty, JSON only, no extra text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    let cleanJSON = response.replace(/```json|```/g, "").replace(/^[^{]*\{/, "{").replace(/\}[^}]*$/, "}").trim();
    
    const parsed = JSON.parse(cleanJSON);

    if (!parsed.mcq || !Array.isArray(parsed.mcq) || parsed.mcq.length === 0) {
      throw new Error("Invalid test format from Gemini");
    }

    const mcqWithIds = parsed.mcq.slice(0, 5).map((q, i) => ({
      id: `q${i + 1}`,
      skill: q.skill || skillsList.split(",")[0],
      question: q.question || "",
      options: q.options?.slice(0, 4) || ["A", "B", "C", "D"],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0
    }));

    return { 
      mcq: mcqWithIds,
      skillFocus: skills,
      roleContext: roleContext,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Gemini Test Generation Error:", error.message);
    console.log("⚠️ Using fallback test immediately");
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