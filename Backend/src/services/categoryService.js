const Category = require("../../models/category.model");

const defaultCategoryNames = [
  "Meeting",
  "To-do",
  "Personal reflection",
  "Brain dump",
  "Idea",
];

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactCaseInsensitiveRegex(text) {
  return new RegExp(`^${escapeRegExp(text)}$`, "i");
}

async function ensureGlobalCategories() {
  try {
    const existing = await Category.find({ scope: "global" });
    const existingNames = new Set(
      existing.map((c) => String(c.name || "").toLowerCase())
    );

    const toInsert = defaultCategoryNames
      .filter((name) => !existingNames.has(String(name).toLowerCase()))
      .map((name) => ({
        name,
        scope: "global",
        userId: null,
      }));

    if (toInsert.length === 0) return;
    await Category.insertMany(toInsert, { ordered: false });
  } catch (e) {
    return;
  }
}

async function validateCategoryAccess({ userId, categoryId }) {
  if (!categoryId) return null;
  const category = await Category.findOne({
    _id: categoryId,
    $or: [
      { scope: "global" },
      { scope: "user", userId },
      { scope: { $exists: false }, userId },
    ],
  });
  return category;
}

async function getCategoriesForUser(userId) {
  await ensureGlobalCategories();

  const globalCategories = await Category.find({ scope: "global" }).sort({
    name: 1,
  });

  const userCategories = await Category.find({
    userId,
    $or: [{ scope: "user" }, { scope: { $exists: false } }],
  }).sort({ name: 1 });

  const globalNameSet = new Set(
    globalCategories.map((c) => String(c.name || "").toLowerCase())
  );

  const filteredUserCategories = userCategories.filter(
    (c) => !globalNameSet.has(String(c.name || "").toLowerCase())
  );

  return [...globalCategories, ...filteredUserCategories];
}

module.exports = {
  defaultCategoryNames,
  exactCaseInsensitiveRegex,
  ensureGlobalCategories,
  getCategoriesForUser,
  validateCategoryAccess,
};
