const express = require("express");
const { authenticateToken } = require("../middleware/authenticateToken");
const { withUser } = require("../middleware/withUser");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/categories", authenticateToken, withUser, (req, res) =>
  listCategories(req, res, req.currentUser)
);
router.post("/categories", authenticateToken, withUser, (req, res) =>
  createCategory(req, res, req.currentUser)
);
router.put("/categories/:categoryID", authenticateToken, withUser, (req, res) =>
  updateCategory(req, res, req.currentUser)
);
router.delete(
  "/categories/:categoryID",
  authenticateToken,
  withUser,
  (req, res) => deleteCategory(req, res, req.currentUser)
);

module.exports = router;
