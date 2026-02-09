const express = require("express");
const { authenticateToken } = require("../middleware/authenticateToken");
const { withUser } = require("../middleware/withUser");
const { seedNotes } = require("../controllers/devController");

const router = express.Router();

router.post("/dev/seed_notes", authenticateToken, withUser, (req, res) =>
  seedNotes(req, res, req.currentUser)
);

module.exports = router;
