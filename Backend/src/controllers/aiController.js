const Category = require("../../models/category.model");
const {
  defaultCategoryNames,
  exactCaseInsensitiveRegex,
  ensureGlobalCategories,
} = require("../services/categoryService");
const {
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
} = require("../services/geminiService");
const Project = require("../../models/project.model");
const StoryDoc = require("../../models/storyDoc.model");
const StoryBible = require("../../models/storyBible.model");
const ProjectMemory = require("../../models/projectMemory.model");
const WritingSource = require("../../models/writingSource.model");
const WritingStyle = require("../../models/writingStyle.model");
const Note = require("../../models/note.model");

async function continueStoryController(req, res) {
  try {
    const { projectContext, previousContext, currentContent, instruction } = req.body;
    
    // We don't strictly require any specific field, but it's good to have at least something
    // If everything is empty, AI will just start a generic story
    
    const continuation = await continueStory({
      projectContext: String(projectContext || "").trim(),
      previousContext: String(previousContext || "").trim(),
      currentContent: String(currentContent || "").trim(),
      instruction: String(instruction || "").trim(),
    });

    return res.json({
      error: false,
      continuation,
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: true,
        message: "GEMINI_API_KEY is not configured",
      });
    }
    console.error("AI Continue Story Error:", e);
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function getWriterContext({ userId, projectId, docId }) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return { project: null };

  const bible =
    (await StoryBible.findOne({ projectId, userId })) ||
    (await StoryBible.create({ projectId, userId }));
  const memory =
    (await ProjectMemory.findOne({ projectId, userId })) ||
    (await ProjectMemory.create({ projectId, userId }));
  const style =
    (await WritingStyle.findOne({ projectId, userId })) ||
    (await WritingStyle.create({ projectId, userId }));

  if (!memory.styleGuidelines && style.guidelines) {
    memory.styleGuidelines = style.guidelines;
    await memory.save();
  }

  const sources = await WritingSource.find({ projectId, userId })
    .sort({ createdOn: -1 })
    .limit(5);

  let doc = null;
  if (docId) {
    doc = await StoryDoc.findOne({ _id: docId, userId });
  }

  let previousDoc = null;
  if (doc) {
    previousDoc = await StoryDoc.findOne({
      projectId,
      userId,
      parentId: doc.parentId || null,
      order: { $lt: doc.order },
      type: "document",
    }).sort({ order: -1 });
  }

  return { project, bible, memory, style, sources, doc, previousDoc };
}

async function writerContinueController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const docId = String(req.body?.docId || "").trim();
    const instruction = String(req.body?.instruction || "").trim();
    const takes = Number(req.body?.takes || 1);

    if (!projectId || !docId) {
      return res.status(400).json({ error: true, message: "projectId and docId are required" });
    }

    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId });
    if (!ctx.project || !ctx.doc) {
      return res.status(404).json({ error: true, message: "Project or document not found" });
    }

    const payload = await writerContinue({
      projectContext: ctx.project.description || `Title: ${ctx.project.title}. Type: ${ctx.project.type}`,
      bible: ctx.bible,
      memory: ctx.memory,
      sources: ctx.sources.map((s) => ({
        title: s.title,
        type: s.type,
        url: s.url,
        contentText: String(s.contentText || "").slice(0, 2500),
      })),
      previousContext: ctx.previousDoc ? String(ctx.previousDoc.content || "").slice(-4000) : "",
      currentContent: String(ctx.doc.content || ""),
      instruction: instruction || "Continue naturally.",
      takes,
    });

    const memoryUpdate = payload?.memory_update || null;
    if (memoryUpdate && typeof memoryUpdate === "object") {
      if (Array.isArray(memoryUpdate.openThreads)) ctx.memory.openThreads = memoryUpdate.openThreads;
      if (Array.isArray(memoryUpdate.keyFacts)) ctx.memory.keyFacts = memoryUpdate.keyFacts;
      if (memoryUpdate.styleGuidelines) {
        ctx.memory.styleGuidelines = String(memoryUpdate.styleGuidelines || "");
        ctx.style.guidelines = ctx.memory.styleGuidelines;
        await ctx.style.save();
      }
      if (memoryUpdate.progress && typeof memoryUpdate.progress === "object") {
        ctx.memory.progress = memoryUpdate.progress;
      }
      ctx.memory.sessionSummaries = Array.isArray(ctx.memory.sessionSummaries)
        ? ctx.memory.sessionSummaries
        : [];
      ctx.memory.sessionSummaries.unshift({
        createdOn: new Date().toISOString(),
        summaryText: String(memoryUpdate.sessionSummary || "Auto-updated from continuation."),
      });
      ctx.memory.sessionSummaries = ctx.memory.sessionSummaries.slice(0, 25);
      await ctx.memory.save();
    }

    return res.json({ error: false, takes: payload?.takes || [], memory: ctx.memory });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function writerRewriteController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const docId = String(req.body?.docId || "").trim();
    const selection = String(req.body?.selection || "").trim();
    const instruction = String(req.body?.instruction || "").trim();
    if (!projectId || !docId || !selection) {
      return res.status(400).json({ error: true, message: "projectId, docId, and selection are required" });
    }
    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId });
    if (!ctx.project || !ctx.doc) {
      return res.status(404).json({ error: true, message: "Project or document not found" });
    }
    const payload = await writerRewrite({
      projectContext: ctx.project.description || `Title: ${ctx.project.title}. Type: ${ctx.project.type}`,
      bible: ctx.bible,
      memory: ctx.memory,
      currentContent: ctx.doc.content || "",
      selection,
      instruction: instruction || "Improve clarity and flow.",
    });
    return res.json({ error: false, content_html: String(payload?.content_html || "") });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function writerOutlineController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const docId = String(req.body?.docId || "").trim();
    const instruction = String(req.body?.instruction || "").trim();
    if (!projectId || !docId) {
      return res.status(400).json({ error: true, message: "projectId and docId are required" });
    }
    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId });
    if (!ctx.project || !ctx.doc) {
      return res.status(404).json({ error: true, message: "Project or document not found" });
    }
    const payload = await writerOutline({
      projectContext: ctx.project.description || `Title: ${ctx.project.title}. Type: ${ctx.project.type}`,
      bible: ctx.bible,
      memory: ctx.memory,
      currentContent: ctx.doc.content || "",
      instruction: instruction || "Create an outline for what comes next.",
    });
    return res.json({ error: false, outline: payload?.outline || [], notes: payload?.notes || "" });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function writerExpandController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const docId = String(req.body?.docId || "").trim();
    const outlineItem = req.body?.outlineItem || null;
    const instruction = String(req.body?.instruction || "").trim();
    if (!projectId || !docId || !outlineItem) {
      return res.status(400).json({ error: true, message: "projectId, docId, and outlineItem are required" });
    }
    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId });
    if (!ctx.project || !ctx.doc) {
      return res.status(404).json({ error: true, message: "Project or document not found" });
    }
    const payload = await writerExpand({
      projectContext: ctx.project.description || `Title: ${ctx.project.title}. Type: ${ctx.project.type}`,
      bible: ctx.bible,
      memory: ctx.memory,
      currentContent: ctx.doc.content || "",
      outlineItem,
      instruction: instruction || "Expand this outline item.",
    });
    return res.json({ error: false, content_html: String(payload?.content_html || "") });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function writerConsistencyController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const docId = String(req.body?.docId || "").trim();
    if (!projectId || !docId) {
      return res.status(400).json({ error: true, message: "projectId and docId are required" });
    }
    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId });
    if (!ctx.project || !ctx.doc) {
      return res.status(404).json({ error: true, message: "Project or document not found" });
    }
    const payload = await writerConsistency({
      projectContext: ctx.project.description || `Title: ${ctx.project.title}. Type: ${ctx.project.type}`,
      bible: ctx.bible,
      memory: ctx.memory,
      currentContent: ctx.doc.content || "",
    });
    return res.json({ error: false, issues: payload?.issues || [] });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function writerStyleProfileController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const docId = String(req.body?.docId || "").trim();
    if (!projectId || !docId) {
      return res.status(400).json({ error: true, message: "projectId and docId are required" });
    }
    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId });
    if (!ctx.project || !ctx.doc) {
      return res.status(404).json({ error: true, message: "Project or document not found" });
    }
    const payload = await writerStyleProfile({ sampleText: String(ctx.doc.content || "").slice(0, 12000) });
    if (payload?.guidelines) {
      ctx.style.guidelines = String(payload.guidelines || "");
      ctx.style.doList = Array.isArray(payload.do) ? payload.do : [];
      ctx.style.dontList = Array.isArray(payload.dont) ? payload.dont : [];
      ctx.style.examples = Array.isArray(payload.examples) ? payload.examples : [];
      await ctx.style.save();
      ctx.memory.styleGuidelines = ctx.style.guidelines;
      await ctx.memory.save();
    }
    return res.json({ error: false, style: ctx.style });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function writerAskController(req, res) {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const question = String(req.body?.question || "").trim();
    if (!projectId || !question) {
      return res.status(400).json({ error: true, message: "projectId and question are required" });
    }
    const ctx = await getWriterContext({ userId: req.user._id, projectId, docId: null });
    if (!ctx.project) {
      return res.status(404).json({ error: true, message: "Project not found" });
    }

    const docs = await StoryDoc.find({ projectId, userId: req.user._id, $text: { $search: question } })
      .select("title content")
      .limit(5);

    const docSnippets = docs.map((d) => ({
      id: String(d._id),
      title: d.title,
      content: String(d.content || "").slice(0, 3000),
    }));

    const notes = await Note.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: question, $options: "i" } },
        { content: { $regex: question, $options: "i" } },
      ],
    })
      .select("title content")
      .limit(3);

    const noteSnippets = notes.map((n) => ({
      id: String(n._id),
      title: n.title,
      content: String(n.content || "").slice(0, 2000),
      type: "note",
    }));

    const payload = await writerAsk({
      projectContext: ctx.project.description || `Title: ${ctx.project.title}. Type: ${ctx.project.type}`,
      bible: ctx.bible,
      memory: ctx.memory,
      sources: ctx.sources.map((s) => ({
        id: String(s._id),
        title: s.title,
        type: s.type,
        url: s.url,
        contentText: String(s.contentText || "").slice(0, 2500),
      })),
      docSnippets: [...docSnippets, ...noteSnippets],
      question,
    });

    return res.json({
      error: false,
      answer_html: String(payload?.answer_html || ""),
      citations: Array.isArray(payload?.citations) ? payload.citations : [],
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({ error: true, message: "GEMINI_API_KEY is not configured" });
    }
    return res.status(500).json({ error: true, message: "Internal server Error" });
  }
}

async function noteDraft(req, res) {
  try {
    // Can accept 'transcript' (from audio) OR 'prompt' (text input)
    // Also accepts 'currentContent' for refinement
    const transcript = String(req.body?.transcript || "").trim();
    const prompt = String(req.body?.prompt || "").trim();
    const currentContent = String(req.body?.currentContent || "").trim();

    if (!transcript && !prompt && !currentContent) {
      return res.status(400).json({
        error: true,
        message: "Transcript or prompt is required",
      });
    }

    await ensureGlobalCategories();

    // Get all existing category names (global + user's if we had user context, but here we just use defaults + generic)
    // In a real app, we might want to fetch all user categories too if available
    const allowedCategories = [...defaultCategoryNames, "Uncategorized"];

    const parsed = await generateNoteDraft({
      transcript,
      prompt,
      currentContent,
      allowedCategories,
    });

    const title = String(parsed.title || "").trim();
    const content = String(parsed.content_html || "").trim();
    const summaryHtml = String(parsed.summary_html || "").trim();
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .map((t) => String(t || "").trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];
    
    // AI suggests a category name
    const categoryName = String(parsed.category || "").trim();

    let categoryId = null;
    let finalCategoryName = categoryName;

    if (categoryName && categoryName.toLowerCase() !== "uncategorized") {
      // 1. Check if it exists globally
      let category = await Category.findOne({
        scope: "global",
        name: { $regex: exactCaseInsensitiveRegex(categoryName) },
      });

      // 2. If not found, check if it exists for this user (if we had user context in this controller, which we might if we query by user)
      // For now, let's just create it as a "custom" category if it doesn't exist globally
      // Note: Category model usually requires 'userId' for custom scope. 
      // We need 'req.user' from authenticateToken middleware.
      
      if (!category && req.user) {
         // Check user's custom categories
         category = await Category.findOne({
            scope: "custom",
            userId: req.user._id,
            name: { $regex: exactCaseInsensitiveRegex(categoryName) },
         });

         if (!category) {
            // Create new custom category
            try {
              category = await Category.create({
                name: categoryName,
                scope: "custom",
                userId: req.user._id,
              });
            } catch (err) {
              console.log("Failed to auto-create category:", err.message);
              // Fallback to Uncategorized or just don't assign ID
            }
         }
      }

      if (category) {
        categoryId = String(category._id);
        finalCategoryName = category.name;
      }
    }

    return res.json({
      error: false,
      draft: {
        title: title || "Untitled",
        content: summaryHtml
          ? `${content}${content ? "<br><br>" : ""}${summaryHtml}`
          : content,
        tags,
        categoryId,
        categoryName: finalCategoryName || null,
      },
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: true,
        message: "GEMINI_API_KEY is not configured",
      });
    }
    console.error("AI Note Draft Error:", e);
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function transcribeUploadedAudio(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: true,
        message: "Audio file is required",
      });
    }

    const mimeType = String(file.mimetype || "").trim().toLowerCase();
    const supported = new Set([
      "audio/wav",
      "audio/x-wav",
      "audio/mp3",
      "audio/mpeg",
      "audio/aiff",
      "audio/x-aiff",
      "audio/aac",
      "audio/ogg",
      "audio/flac",
    ]);
    if (!supported.has(mimeType)) {
      return res.status(400).json({
        error: true,
        message:
          "Unsupported audio type. Please upload WAV, MP3, AAC, OGG, AIFF, or FLAC.",
      });
    }

    const base64Audio = file.buffer.toString("base64");
    const languageHint = String(req.body?.language || "").trim() || null;

    const transcript = await transcribeAudio({
      mimeType,
      base64Audio,
      languageHint,
    });

    return res.json({
      error: false,
      transcript,
    });
  } catch (e) {
    const msg = String(e?.message || "");
    if (e?.code === "NO_GEMINI_KEY" || msg.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        error: true,
        message: "GEMINI_API_KEY is not configured",
      });
    }
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

module.exports = {
  noteDraft,
  transcribeUploadedAudio,
  continueStoryController,
  writerContinueController,
  writerRewriteController,
  writerOutlineController,
  writerExpandController,
  writerConsistencyController,
  writerStyleProfileController,
  writerAskController,
};
