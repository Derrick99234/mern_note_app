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
    '  - summary_html: string (HTML using <p>, <br>, <strong>, <em>, <ul>, <ol>, <li>; keep concise)',
    "  - tags: array of 0-6 short strings (no #)",
    `  - category: string (Choose from: ${allowedCategories.join(", ")} OR create a new short category name if none fit)`,
    "Rules:",
    "  - Use the same language as the input.",
    "  - Do NOT include markdown fences.",
    "  - Remove filler words and obvious repetitions.",
    "  - Use paragraphs and bullet lists where helpful for readability.",
    "  - Make content comprehensive but not verbose.",
    '  - summary_html MUST be a short section that starts with: <p><strong>Summary</strong></p> and then 3-6 bullet points.',
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

async function continueStory({ projectContext, previousContext, currentContent, instruction }) {
  const ai = getClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "NO_GEMINI_KEY";
    throw err;
  }

  const prompt = [
    "System: You are an intelligent creative writing assistant.",
    "Your goal is to continue the story/content seamlessly based on the provided context.",
    "Rules:",
    "  - Maintain the established tone, style, and character voices.",
    "  - Advance the plot or argument logically.",
    "  - If 'instruction' is provided, follow it specifically (e.g., 'introduce a villain', 'summarize this part').",
    "  - Return HTML formatted content suitable for a rich text editor (paragraphs <p>, etc.).",
    "  - Do NOT wrap in markdown code blocks.",
    "",
    "Project Context (Summary/Description):",
    projectContext || "No specific project context.",
    "",
    "Previous Context (Last few paragraphs/scene):",
    previousContext || "No previous context.",
    "",
    "Current Content (The user is writing here):",
    currentContent || "(Start of document)",
    "",
    "User Instruction for Continuation:",
    instruction || "Continue the story naturally.",
  ].join("\n");

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [prompt],
  });

  return String(result?.text || "").trim();
}

async function generateJson({ system, rules, sections, model }) {
  const ai = getClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "NO_GEMINI_KEY";
    throw err;
  }

  const prompt = [
    system || "System: You are a helpful AI assistant.",
    ...(Array.isArray(rules) ? rules : []),
    "",
    ...(Array.isArray(sections) ? sections : []),
  ]
    .filter(Boolean)
    .join("\n");

  const result = await ai.models.generateContent({
    model: model || "gemini-3-flash-preview",
    contents: [prompt],
  });
  const text = String(result?.text || "").trim();
  const parsed = extractFirstJsonObject(text);
  if (!parsed) {
    const err = new Error("AI response could not be parsed");
    err.code = "PARSE_ERROR";
    err.raw = text;
    throw err;
  }
  return parsed;
}

async function writerContinue({ projectContext, bible, memory, sources, previousContext, currentContent, instruction, takes }) {
  const nTakes = Math.max(1, Math.min(Number(takes || 1), 3));
  const parsed = await generateJson({
    system: "System: You are an expert writing assistant with strong continuity tracking.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - takes: array (length 1-3) of { title: string, content_html: string }",
      "  - memory_update: { openThreads: string[], keyFacts: string[], styleGuidelines: string, progress: object, sessionSummary: string }",
      "Rules:",
      "  - content_html must be HTML (<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>).",
      "  - Maintain established characters, plot facts, tone, and terminology.",
      "  - Continue from currentContent, keeping continuity with previousContext.",
      "  - Use sources ONLY for facts; do not invent citations.",
      `  - Generate exactly ${nTakes} take(s) with meaningfully different pacing/approach, but consistent canon.`,
    ],
    sections: [
      "Project Context:",
      String(projectContext || ""),
      "",
      "Story Bible (canon):",
      JSON.stringify(bible || {}, null, 2),
      "",
      "Project Memory:",
      JSON.stringify(memory || {}, null, 2),
      "",
      "Sources (facts only):",
      JSON.stringify(sources || [], null, 2),
      "",
      "Previous Context:",
      String(previousContext || ""),
      "",
      "Current Content:",
      String(currentContent || ""),
      "",
      "Instruction:",
      String(instruction || "Continue naturally."),
    ],
  });
  return parsed;
}

async function writerRewrite({ projectContext, bible, memory, currentContent, selection, instruction }) {
  const parsed = await generateJson({
    system: "System: You are an expert editor and writing assistant.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - content_html: string",
      "Rules:",
      "  - content_html must be HTML (<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>).",
      "  - Preserve meaning unless instruction requests otherwise.",
      "  - Match the established tone/style.",
      "  - Do NOT add markdown fences.",
    ],
    sections: [
      "Project Context:",
      String(projectContext || ""),
      "",
      "Story Bible:",
      JSON.stringify(bible || {}, null, 2),
      "",
      "Project Memory:",
      JSON.stringify(memory || {}, null, 2),
      "",
      "Current Document (for context):",
      String(currentContent || ""),
      "",
      "Target Selection (rewrite this):",
      String(selection || ""),
      "",
      "Instruction:",
      String(instruction || "Improve clarity and flow."),
    ],
  });
  return parsed;
}

async function writerOutline({ projectContext, bible, memory, currentContent, instruction }) {
  const parsed = await generateJson({
    system: "System: You are a writing strategist and outlining assistant.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - outline: array of { id: string, title: string, purpose: string, beats: string[] }",
      "  - notes: string",
      "Rules:",
      "  - Keep outline actionable and sequential.",
      "  - Maintain canon and tone.",
    ],
    sections: [
      "Project Context:",
      String(projectContext || ""),
      "",
      "Story Bible:",
      JSON.stringify(bible || {}, null, 2),
      "",
      "Project Memory:",
      JSON.stringify(memory || {}, null, 2),
      "",
      "Current Content:",
      String(currentContent || ""),
      "",
      "Instruction:",
      String(instruction || "Create an outline for the next sections."),
    ],
  });
  return parsed;
}

async function writerExpand({ projectContext, bible, memory, currentContent, outlineItem, instruction }) {
  const parsed = await generateJson({
    system: "System: You are a writing assistant that expands outlines into polished prose/scripts.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - content_html: string",
      "Rules:",
      "  - content_html must be HTML (<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>).",
      "  - Maintain tone and canon.",
      "  - Expand the outlineItem into the next section(s).",
    ],
    sections: [
      "Project Context:",
      String(projectContext || ""),
      "",
      "Story Bible:",
      JSON.stringify(bible || {}, null, 2),
      "",
      "Project Memory:",
      JSON.stringify(memory || {}, null, 2),
      "",
      "Current Content:",
      String(currentContent || ""),
      "",
      "Outline Item to Expand:",
      JSON.stringify(outlineItem || {}, null, 2),
      "",
      "Instruction:",
      String(instruction || "Expand this outline item."),
    ],
  });
  return parsed;
}

async function writerConsistency({ projectContext, bible, memory, currentContent }) {
  const parsed = await generateJson({
    system: "System: You are a continuity and consistency editor.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - issues: array of { type: string, severity: string, description: string, suggestion: string }",
      "Rules:",
      "  - severity must be one of: low, medium, high.",
      "  - Focus on contradictions in names, timeline, tone drift, plot holes, and unresolved threads.",
    ],
    sections: [
      "Project Context:",
      String(projectContext || ""),
      "",
      "Story Bible:",
      JSON.stringify(bible || {}, null, 2),
      "",
      "Project Memory:",
      JSON.stringify(memory || {}, null, 2),
      "",
      "Current Content:",
      String(currentContent || ""),
    ],
  });
  return parsed;
}

async function writerStyleProfile({ sampleText }) {
  const parsed = await generateJson({
    system: "System: You infer a writing style profile from a user's text.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - guidelines: string",
      "  - do: string[]",
      "  - dont: string[]",
      "  - examples: string[]",
      "Rules:",
      "  - Keep it short and practical.",
      "  - Match the language of sampleText.",
    ],
    sections: ["Sample Text:", String(sampleText || "")],
  });
  return parsed;
}

async function writerAsk({ projectContext, bible, memory, sources, docSnippets, question }) {
  const parsed = await generateJson({
    system: "System: You answer questions using provided project context and citations.",
    rules: [
      "Return ONLY valid JSON with keys:",
      "  - answer_html: string",
      "  - citations: array of { title: string, type: string, id: string, quote: string }",
      "Rules:",
      "  - If unsure, say so and ask a follow-up question.",
      "  - Base factual claims on sources/docSnippets when possible.",
      "  - answer_html must be HTML (<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>).",
    ],
    sections: [
      "Project Context:",
      String(projectContext || ""),
      "",
      "Story Bible:",
      JSON.stringify(bible || {}, null, 2),
      "",
      "Project Memory:",
      JSON.stringify(memory || {}, null, 2),
      "",
      "Sources (facts only):",
      JSON.stringify(sources || [], null, 2),
      "",
      "Doc Snippets:",
      JSON.stringify(docSnippets || [], null, 2),
      "",
      "Question:",
      String(question || ""),
    ],
  });
  return parsed;
}

module.exports = {
  generateNoteDraft,
  transcribeAudio,
  continueStory,
  writerContinue,
  writerRewrite,
  writerOutline,
  writerExpand,
  writerConsistency,
  writerStyleProfile,
  writerAsk,
};
