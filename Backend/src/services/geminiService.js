const { GoogleGenAI } = require("@google/genai");

function extractFirstJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : raw;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  const slice = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function generateNoteDraft({ transcript, prompt, currentContent, allowedCategories }) {
  const ai = getClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "NO_GEMINI_KEY";
    throw err;
  }

  const isRefinement = !!currentContent;
  const inputContext = transcript || prompt || "Create a note about this.";

  const rules = [
    "Return ONLY valid JSON with keys:",
    '  - title: string (short, descriptive)',
    '  - content_html: string (HTML using <p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>)',
    "  - tags: array of 0-6 short strings (no #)",
    `  - category: string (Choose from: ${allowedCategories.join(", ")} OR create a new short category name if none fit)`,
    "Rules:",
    "  - Use the same language as the input.",
    "  - Do NOT include markdown fences.",
  ];

  if (isRefinement) {
    rules.push("  - You are refining an existing note based on the user's instruction.");
    rules.push("  - Keep the original intent but improve/modify as requested.");
  } else {
    rules.push("  - You are creating a new structured note from the input.");
  }

  const finalPrompt = [
    "System: You are an AI note assistant.",
    ...rules,
    "",
    isRefinement ? "Current Content (HTML):" : "",
    isRefinement ? currentContent : "",
    "",
    "User Instruction / Input:",
    inputContext,
  ].filter(Boolean).join("\n");

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [finalPrompt],
  });
  const text = String(result?.text || "").trim();
  const parsed = extractFirstJsonObject(text);
  if (!parsed) {
    const err = new Error("AI response could not be parsed");
    err.code = "PARSE_ERROR";
    throw err;
  }
  return parsed;
}

async function transcribeAudio({ mimeType, base64Audio, languageHint }) {
  const ai = getClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "NO_GEMINI_KEY";
    throw err;
  }

  const prompt = [
    "Transcribe this audio into text.",
    "Rules:",
    "  - Use the same language as the audio. Do not translate.",
    "  - Return ONLY plain text (no JSON, no markdown).",
    languageHint ? `Language hint: ${languageHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
    ],
  });

  return String(result?.text || "").trim();
}

module.exports = {
  generateNoteDraft,
  transcribeAudio,
};
