const express = require("express");
const multer = require("multer");
const { authenticateToken } = require("../middleware/authenticateToken");
const { noteDraft, transcribeUploadedAudio } = require("../controllers/aiController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.post("/ai/note_draft", authenticateToken, noteDraft);
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
