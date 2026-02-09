const express = require("express");
const { authenticateToken } = require("../middleware/authenticateToken");
const { withUser } = require("../middleware/withUser");
const {
  addNote,
  deleteNote,
  editNote,
  getAllNotes,
  searchNotes,
  updatePinned,
} = require("../controllers/noteController");

const router = express.Router();

router.post("/add_note", authenticateToken, withUser, (req, res) =>
  addNote(req, res, req.currentUser)
);
router.put("/edit_note/:noteID", authenticateToken, withUser, (req, res) =>
  editNote(req, res, req.currentUser)
);
router.get("/get_all_notes", authenticateToken, withUser, (req, res) =>
  getAllNotes(req, res, req.currentUser)
);
router.delete("/delete_note/:noteID", authenticateToken, withUser, (req, res) =>
  deleteNote(req, res, req.currentUser)
);
router.put(
  "/update_note_pinned/:noteID",
  authenticateToken,
  withUser,
  (req, res) => updatePinned(req, res, req.currentUser)
);
router.get("/search_notes/", authenticateToken, withUser, (req, res) =>
  searchNotes(req, res, req.currentUser)
);

module.exports = router;
