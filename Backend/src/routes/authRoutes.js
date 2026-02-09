const express = require("express");
const { createAccount, login, refreshToken } = require("../controllers/authController");

const router = express.Router();

router.post("/create_acct", createAccount);
router.post("/login", login);
router.post("/refresh_token", refreshToken);

module.exports = router;
