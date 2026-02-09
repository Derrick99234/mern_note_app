const Category = require("../../models/category.model");
const {
  defaultCategoryNames,
  exactCaseInsensitiveRegex,
  ensureGlobalCategories,
} = require("../services/categoryService");
const { generateNoteDraft, transcribeAudio } = require("../services/geminiService");

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
        content,
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
};
