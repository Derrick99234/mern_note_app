const express = require("express");
const { authenticateToken } = require("../middleware/authenticateToken");
const { withUser } = require("../middleware/withUser");
const { getUser } = require("../controllers/userController");

const router = express.Router();

router.get("/get_user", authenticateToken, withUser, (req, res) =>
  getUser(req, res, req.currentUser)
);

module.exports = router;
