const Category = require("../../models/category.model");
const Note = require("../../models/note.model");
const {
  exactCaseInsensitiveRegex,
  getCategoriesForUser,
} = require("../services/categoryService");

async function listCategories(req, res, user) {
  try {
    const categories = await getCategoriesForUser(String(user._id));
    return res.json({
      error: false,
      categories,
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function createCategory(req, res, user) {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        error: true,
        message: "Category name is required",
      });
    }

    const userId = String(user._id);

    const reserved = await Category.findOne({
      scope: "global",
      name: { $regex: exactCaseInsensitiveRegex(name) },
    });

    if (reserved) {
      return res.status(400).json({
        error: true,
        message: "This category name is reserved",
      });
    }

    const existing = await Category.findOne({
      userId,
      $or: [{ scope: "user" }, { scope: { $exists: false } }],
      name: { $regex: exactCaseInsensitiveRegex(name) },
    });

    if (existing) {
      return res.json({
        error: false,
        category: existing,
        message: "Category already exists",
      });
    }

    const category = new Category({ name, scope: "user", userId });
    await category.save();

    return res.json({
      error: false,
      category,
      message: "Category created successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function updateCategory(req, res, user) {
  try {
    const categoryID = req.params.categoryID;
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        error: true,
        message: "Category name is required",
      });
    }

    const reserved = await Category.findOne({
      scope: "global",
      name: { $regex: exactCaseInsensitiveRegex(name) },
    });

    if (reserved) {
      return res.status(400).json({
        error: true,
        message: "This category name is reserved",
      });
    }

    const category = await Category.findOne({
      _id: categoryID,
      userId: String(user._id),
      $or: [{ scope: "user" }, { scope: { $exists: false } }],
    });

    if (!category) {
      return res.status(404).json({
        error: true,
        message: "Category not found",
      });
    }

    const duplicate = await Category.findOne({
      _id: { $ne: categoryID },
      userId: String(user._id),
      $or: [{ scope: "user" }, { scope: { $exists: false } }],
      name: { $regex: exactCaseInsensitiveRegex(name) },
    });

    if (duplicate) {
      return res.status(400).json({
        error: true,
        message: "Category already exists",
      });
    }

    category.name = name;
    if (!category.scope) category.scope = "user";
    if (category.userId === undefined) category.userId = String(user._id);
    await category.save();

    return res.json({
      error: false,
      category,
      message: "Category updated successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function deleteCategory(req, res, user) {
  try {
    const categoryID = req.params.categoryID;
    const category = await Category.findOne({
      _id: categoryID,
      userId: String(user._id),
      $or: [{ scope: "user" }, { scope: { $exists: false } }],
    });

    if (!category) {
      return res.status(404).json({
        error: true,
        message: "Category not found",
      });
    }

    await Note.updateMany(
      { userId: String(user._id), categoryId: String(category._id) },
      { $set: { categoryId: null } }
    );

    await Category.deleteOne({ _id: categoryID, userId: String(user._id) });

    return res.json({
      error: false,
      message: "Category deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

module.exports = {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
};

