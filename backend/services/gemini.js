const { GoogleGenAI } = require('@google/genai');

// Check if Gemini API Key is configured
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here') {
  try {
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log("🤖 Gemini API client initialized successfully using @google/genai SDK.");
  } catch (err) {
    console.error("⚠️ Failed to initialize Gemini API SDK. Using mock analyzer fallback.", err.message);
  }
} else {
  console.log("ℹ️ No Gemini API Key found. Running Gemini in MOCK Mode.");
}

/**
 * Mock Gemini Analyzer based on textual hints
 */
function mockAnalyzeImage(description = '', caption = '', fileName = '') {
  const text = `${description} ${caption} ${fileName}`.toLowerCase();
  
  let category = 'Sanitation & Garbage';
  let severity = 'Medium';
  let priorityScore = 55;
  let title = 'General Community Project';
  let summary = 'A local civic issue has been reported. Needs community volunteers to coordinate a cleanup or repair.';
  let estimatedVolunteers = 3;
  let estimatedHours = 3;
  let requiredEquipment = ['Gloves', 'Trash bags', 'High-visibility vests'];
  let suggestedActionPlan = ['Set a cleanup date', 'Gather volunteers', 'Collect and sort debris', 'Transport waste to disposal depot'];
  let safetyTips = 'Wear thick protective gloves and safety vests. Avoid heavy lifting alone.';
  let environmentalImpact = 'Cleans the local environment, prevents hazardous runoff, and discourages pests.';
  let difficulty = 'Medium';

  if (text.includes('pothole') || text.includes('road') || text.includes('asphalt') || text.includes('street') || text.includes('cracked') || text.includes('pavement')) {
    category = 'Roads & Potholes';
    severity = text.includes('huge') || text.includes('dangerous') || text.includes('accident') ? 'Critical' : 'High';
    priorityScore = severity === 'Critical' ? 90 : 72;
    title = 'Asphalt Repair & Pothole Patching';
    summary = 'Erosion and structural cracks in local asphalt creating safety risks. Perfect project for a local road patch team.';
    estimatedVolunteers = 4;
    estimatedHours = 4;
    requiredEquipment = ['Cold asphalt patch compound', 'Brooms', 'Hand tamper', 'Traffic cones', 'Safety vests'];
    suggestedActionPlan = ['Block lane with cones and set warning signs', 'Sweep pothole cavity clean of debris', 'Fill with cold asphalt compound', 'Compact until level with pavement'];
    safetyTips = 'Coordinate traffic control. Work in high-visibility clothing during daylight hours.';
    environmentalImpact = 'Eliminates pavement decay and improves safety for cyclists and vehicles.';
    difficulty = 'Medium';
  } else if (text.includes('water') || text.includes('leak') || text.includes('sewage') || text.includes('pipe') || text.includes('flooding') || text.includes('drain')) {
    category = 'Water & Sewage';
    severity = text.includes('flood') || text.includes('burst') ? 'Critical' : 'High';
    priorityScore = severity === 'Critical' ? 95 : 78;
    title = 'Water Pipeline Leak Repair';
    summary = 'Sidewalk water line leakage causing water wastage. Localized plumbing fix needed.';
    estimatedVolunteers = 2;
    estimatedHours = 5;
    requiredEquipment = ['Wrench set', 'Replacement PVC pipe sleeve', 'Sealant tape', 'Shovel'];
    suggestedActionPlan = ['Locate main shut-off valve', 'Dig to expose leaking section', 'Apply PVC repair sleeve', 'Refill and level surface'];
    safetyTips = 'Watch for electrical conduits. Ensure water pressure is shut off before dismantling joints.';
    environmentalImpact = 'Preserves drinking water resources and prevents sidewalk soil erosion.';
    difficulty = 'Hard';
  } else if (text.includes('garbage') || text.includes('trash') || text.includes('dump') || text.includes('litter') || text.includes('waste')) {
    category = 'Sanitation & Garbage';
    severity = text.includes('toxic') || text.includes('smell') ? 'High' : 'Medium';
    priorityScore = severity === 'High' ? 68 : 52;
    title = 'Alleyway Cleanup & Trash Removal';
    summary = 'Accumulated commercial and municipal trash blocking access. Requires volunteer cleanup crew.';
    estimatedVolunteers = 5;
    estimatedHours = 3;
    requiredEquipment = ['Heavy gloves', 'Trash bags', 'Trash grabbers', 'Shovels', 'Pickup truck'];
    suggestedActionPlan = ['Bag smaller litter and sort plastics', 'Load bulk debris onto utility vehicles', 'Sweep the area clean', 'Transport to recycling depot'];
    safetyTips = 'Wear thick leather gloves. Do not touch sharp glass or chemical containers.';
    environmentalImpact = 'Restores neighborhood aesthetics and eliminates biological threats.';
    difficulty = 'Medium';
  } else if (text.includes('light') || text.includes('streetlight') || text.includes('bulb') || text.includes('dark') || text.includes('lamp')) {
    category = 'Streetlights';
    severity = text.includes('intersection') ? 'High' : 'Medium';
    priorityScore = severity === 'High' ? 65 : 48;
    title = 'Streetlight Bulbs Replacement';
    summary = 'Inoperative lighting fixture creating dark zones. Requires bulb replacement and wire verification.';
    estimatedVolunteers = 2;
    estimatedHours = 2;
    requiredEquipment = ['Multimeter', 'LED light bulbs', 'A-frame ladder', 'Insulated gloves'];
    suggestedActionPlan = ['Position ladder safely', 'Remove luminaire casing', 'Verify voltage with multimeter', 'Swap bulb with LED and close casing'];
    safetyTips = 'Turn off the main pole power breaker. Do not work in wet conditions.';
    environmentalImpact = 'Lowers energy consumption and provides safety lighting for residents.';
    difficulty = 'Medium';
  }

  return {
    category,
    severity,
    priorityScore,
    title: `AI Action Plan: ${title}`,
    summary,
    estimatedVolunteers,
    estimatedHours,
    requiredEquipment,
    suggestedActionPlan,
    safetyTips,
    environmentalImpact,
    difficulty
  };
}

/**
 * Validate whether image shows a genuine community/civic problem.
 * Returns { valid: bool, reason: string }
 */
async function validateImage(imageBuffer, mimeType) {
  if (!ai) {
    // In mock mode, always pass validation
    return { valid: true, reason: 'Mock mode - validation skipped.' };
  }

  try {
    const prompt = `You are a strict community issue moderator. Analyze this image and determine if it shows a genuine community/civic/infrastructure problem that needs community volunteer action.

ACCEPT these types: garbage dumps, broken roads, potholes, water leaks, fallen trees, broken streetlights, public infrastructure damage, illegal dumping, blocked drains, overflowing bins, graffiti on public property.

REJECT these types: selfies, people's faces, food, pets/animals, memes, anime, wallpapers, screenshots of apps/websites, blank/empty images, indoor home objects, vacation/travel photos, cars without visible damage/issue, text screenshots, adult content.

Respond with ONLY a JSON object (no markdown) in this format:
{"valid": true, "reason": "Brief explanation"}
or
{"valid": false, "reason": "Brief explanation of why rejected"}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { data: imageBuffer.toString('base64'), mimeType } }
      ]
    });

    const text = result.text.trim().replace(/^```json\s*/,'').replace(/```$/,'').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('⚠️ Image validation failed:', err.message);
    return { valid: true, reason: 'Validation skipped due to error.' };
  }
}

/**
 * Analyze an image using Gemini - returns structured intelligence data.
 * Does NOT generate captions (that's HuggingFace's job).
 */
async function analyzeImage(imageBuffer, mimeType, caption = '', description = '', fileName = '') {
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockAnalyzeImage(description, caption, fileName));
      }, 1200);
    });
  }

  try {
    const prompt = `You are an AI community action coordinator. A community problem has been reported.

Image caption (auto-generated): "${caption}"
User description: "${description}"

Analyze the image and caption to produce structured community action intelligence. Return ONLY a raw JSON object (no markdown):

{
  "category": "one of: Roads & Potholes | Sanitation & Garbage | Water & Sewage | Streetlights | Others",
  "severity": "one of: Low | Medium | High | Critical",
  "priorityScore": <integer 0-100>,
  "title": "short action-oriented title",
  "summary": "1-2 sentence problem description",
  "estimatedVolunteers": <integer>,
  "estimatedHours": <number>,
  "requiredEquipment": ["item1", "item2", "item3"],
  "suggestedActionPlan": ["step1", "step2", "step3", "step4"],
  "safetyTips": "1-2 sentence safety instructions",
  "environmentalImpact": "1 sentence ecological benefit",
  "difficulty": "one of: Low | Medium | Hard"
}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { data: imageBuffer.toString('base64'), mimeType } }
      ]
    });

    const text = result.text.trim().replace(/^```json\s*/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error("🔴 Gemini Image analysis failed. Falling back to mock.", error.message);
    return mockAnalyzeImage(description, caption, fileName);
  }
}

/**
 * Civic Assistant chatbot using Gemini
 */
async function generateChatResponse(message, conversationHistory = []) {
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let reply = "Hello! I am your Community Action Assistant. I help coordinate local cleanups and infrastructure repairs. Describe a problem and I'll help you organize a volunteer project!";
        const msg = message.toLowerCase();
        if (msg.includes('status') || msg.includes('workflow')) {
          reply = "Projects progress: Reported → Community Joined → In Progress → Completed → Community Verified. Each step is triggered automatically by volunteer actions.";
        } else if (msg.includes('points') || msg.includes('reputation')) {
          reply = "Earn points: Report +20, Join +10, Comment +5, Upload Photo +15, Complete Project +60 (volunteer +40), Verification +10. Leaderboard updates in real time!";
        } else if (msg.includes('pothole') || msg.includes('road')) {
          reply = "Report the pothole with a photo, add location, and our AI will suggest materials and steps. Other neighbors can join your crew!";
        }
        resolve(reply);
      }, 800);
    });
  }

  try {
    const contents = conversationHistory.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: `You are "HeroBot", a friendly AI coordinator for the community action platform "Community Hero". Help citizens solve local civic issues collaboratively. Answer concisely in 2-3 sentences. User: "${message}"` }]
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });

    return result.text;
  } catch (error) {
    console.error("🔴 Gemini Chat failed.", error.message);
    return "I'm having connectivity issues. Please try again shortly!";
  }
}

/**
 * Process speech transcript into report parameters
 */
async function processSpeechTranscript(transcript) {
  if (!ai) {
    const details = mockAnalyzeImage(transcript);
    return {
      title: details.title.replace('AI Action Plan: ', ''),
      description: transcript,
      category: details.category,
      severity: details.severity
    };
  }

  try {
    const prompt = `A citizen reported an issue via voice: "${transcript}"
Extract and return ONLY raw JSON (no markdown):
{"title":"action title","description":"expanded description","category":"Roads & Potholes|Sanitation & Garbage|Water & Sewage|Streetlights|Others","severity":"Low|Medium|High|Critical"}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const text = result.text.trim().replace(/^```json\s*/,'').replace(/```$/,'').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("🔴 Gemini speech parsing failed.", error.message);
    const details = mockAnalyzeImage(transcript);
    return { title: details.title.replace('AI Action Plan: ', ''), description: transcript, category: details.category, severity: details.severity };
  }
}

/**
 * Generate predictive insights from historical reports
 */
async function generatePredictiveInsights(reports) {
  if (!ai) {
    return {
      summary: "Community metrics show high volunteer engagement. Sanitation and road issues are most common. Weekend cleanups achieve 90%+ resolution rates.",
      predictions: [
        { title: "Pre-Rainfall Road Sealing Drive", description: "Pothole erosion increases 45% during wet months.", probability: "High (85%)", recommendation: "Organize asphalt repair projects before monsoon season." },
        { title: "Weekend Sanitation Campaign", description: "Garbage reports spike 3x on weekends near parks.", probability: "Critical (90%)", recommendation: "Schedule Sunday morning garbage collections." },
        { title: "Winter Streetlight Replacement", description: "Dark spots increase pedestrian risks 50% in winter.", probability: "Medium (70%)", recommendation: "Coordinate LED swap events with community gardens." }
      ],
      communityImpactScore: 84,
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const reportsSummary = reports.slice(0, 50).map(r => ({
      category: r.category, severity: r.severity, ward: r.ward,
      createdAt: r.createdAt, status: r.status, volunteers: (r.volunteers || []).length
    }));

    const prompt = `Analyze this community action data and return ONLY raw JSON (no markdown):
{"summary":"3-4 sentences","predictions":[{"title":"...","description":"...","probability":"...","recommendation":"..."}],"communityImpactScore":85}
Data: ${JSON.stringify(reportsSummary)}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const text = result.text.trim().replace(/^```json\s*/,'').replace(/```$/,'').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("🔴 Gemini predictive insights failed.", error.message);
    return { summary: "Analysis unavailable.", predictions: [], communityImpactScore: 70, lastUpdated: new Date().toISOString() };
  }
}

module.exports = {
  analyzeImage,
  validateImage,
  generateChatResponse,
  processSpeechTranscript,
  generatePredictiveInsights
};
