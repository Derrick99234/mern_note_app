const Category = require("../../models/category.model");
const Note = require("../../models/note.model");
const { ensureGlobalCategories } = require("../services/categoryService");

async function seedNotes(req, res, user) {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: true, message: "Not found" });
    }

    await ensureGlobalCategories();
    const userId = String(user._id);

    const globalCategories = await Category.find({ scope: "global" });
    const userCategories = await Category.find({
      userId,
      $or: [{ scope: "user" }, { scope: { $exists: false } }],
    });

    const categories = [...globalCategories, ...userCategories];

    const randomInt = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const sampleTags = [
      "work",
      "personal",
      "todo",
      "meeting",
      "idea",
      "journal",
      "brain-dump",
      "project",
    ];

    const makeTags = () => {
      const count = randomInt(0, 3);
      const set = new Set();
      while (set.size < count) {
        set.add(sampleTags[randomInt(0, sampleTags.length - 1)]);
      }
      return Array.from(set);
    };

    const makeContent = ({ categoryName, idx }) => {
      const lines = [
        `<p><strong>${categoryName}</strong> sample note #${idx}</p>`,
        "<ul>",
        "<li>First point</li>",
        "<li>Second point</li>",
        "</ul>",
      ];
      return lines.join("");
    };

    const notes = [];
    categories.forEach((c) => {
      const n = randomInt(2, 6);
      for (let i = 1; i <= n; i++) {
        notes.push(
          new Note({
            title: `${c.name} note ${i}`,
            content: makeContent({ categoryName: c.name, idx: i }),
            tags: makeTags(),
            categoryId: String(c._id),
            userId: user._id,
            isPinned: false,
          })
        );
      }
    });

    const uncategorizedCount = randomInt(2, 5);
    for (let i = 1; i <= uncategorizedCount; i++) {
      notes.push(
        new Note({
          title: `Uncategorized note ${i}`,
          content: `<p>Uncategorized sample note #${i}</p>`,
          tags: makeTags(),
          categoryId: null,
          userId: user._id,
          isPinned: false,
        })
      );
    }

    await Note.insertMany(notes);

    return res.json({
      error: false,
      message: "Seeded demo notes",
      created: notes.length,
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

module.exports = { seedNotes };

