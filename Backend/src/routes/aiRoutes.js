const express = require("express");
const multer = require("multer");
const { authenticateToken } = require("../middleware/authenticateToken");
const {
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
} = require("../controllers/aiController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.post("/ai/note_draft", authenticateToken, noteDraft);
router.post("/ai/continue_story", authenticateToken, continueStoryController);
router.post("/ai/writer/continue", authenticateToken, writerContinueController);
router.post("/ai/writer/rewrite", authenticateToken, writerRewriteController);
router.post("/ai/writer/outline", authenticateToken, writerOutlineController);
router.post("/ai/writer/expand", authenticateToken, writerExpandController);
router.post("/ai/writer/consistency", authenticateToken, writerConsistencyController);
router.post("/ai/writer/style_profile", authenticateToken, writerStyleProfileController);
router.post("/ai/writer/ask", authenticateToken, writerAskController);
router.post(
  "/ai/transcribe_audio",
  authenticateToken,
  upload.single("audio"),
  transcribeUploadedAudio
);

router.use((err, req, res, next) => {
  const code = String(err?.code || "");
  if (code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: true,
      message: "Audio file is too large (max 20MB)",
    });
  }
  return res.status(500).json({
    error: true,
    message: "Internal server Error",
  });
});

module.exports = router;
