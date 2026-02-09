const Note = require("../../models/note.model");
const { validateCategoryAccess } = require("../services/categoryService");

async function addNote(req, res, user) {
  const { title, content, tags, categoryId } = req.body;

  if (!title) {
    return res.status(400).json({ error: true, message: "Title is Required" });
  }

  if (!content) {
    return res.status(400).json({ error: true, message: "Content is Required" });
  }

  try {
    if (categoryId) {
      const category = await validateCategoryAccess({
        userId: String(user._id),
        categoryId: String(categoryId),
      });
      if (!category) {
        return res.status(400).json({
          error: true,
          message: "Invalid category",
        });
      }
    }

    const note = new Note({
      title,
      content,
      tags: tags || [],
      categoryId: categoryId ? String(categoryId) : null,
      userId: user._id,
    });

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note added successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: `Internal server Error: ${e}`,
    });
  }
}

async function editNote(req, res, user) {
  const noteID = req.params.noteID;
  const { title, content, tags, isPinned, categoryId } = req.body;

  if (
    title === undefined &&
    content === undefined &&
    tags === undefined &&
    isPinned === undefined &&
    categoryId === undefined
  ) {
    return res
      .status(400)
      .json({ error: true, message: "No changes Provided" });
  }

  try {
    const note = await Note.findOne({ _id: noteID, userId: user._id });

    if (!note) {
      return res.status(400).json({
        error: true,
        message: "Note not found",
      });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (typeof isPinned === "boolean") note.isPinned = isPinned;

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        note.categoryId = null;
      } else {
        const category = await validateCategoryAccess({
          userId: String(user._id),
          categoryId: String(categoryId),
        });
        if (!category) {
          return res.status(400).json({
            error: true,
            message: "Invalid category",
          });
        }
        note.categoryId = String(categoryId);
      }
    }

    await note.save();
    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function getAllNotes(req, res, user) {
  try {
    const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });

    return res.json({
      error: false,
      notes,
      message: "All Notes Retrived succcessfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal Server error",
    });
  }
}

async function deleteNote(req, res, user) {
  const noteID = req.params.noteID;

  try {
    const note = await Note.findOne({ _id: noteID, userId: user._id });

    if (!note) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }

    await Note.deleteOne({ _id: noteID, userId: user._id });

    return res.json({
      error: false,
      message: "Note deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
}

async function updatePinned(req, res, user) {
  const noteID = req.params.noteID;
  const { isPinned } = req.body;

  try {
    const note = await Note.findOne({ _id: noteID, userId: user._id });

    if (!note) {
      return res.status(400).json({
        error: true,
        message: "Note not found",
      });
    }

    note.isPinned = isPinned;

    await note.save();
    return res.json({
      error: false,
      note,
      message: "Note updated successfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

async function searchNotes(req, res, user) {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      error: true,
      message: "Search query is required",
    });
  }
  try {
    const matching_note = await Note.find({
      userId: user._id,
      $or: [
        { title: { $regex: new RegExp(query, "i") } },
        { content: { $regex: new RegExp(query, "i") } },
      ],
    });

    return res.json({
      error: false,
      notes: matching_note,
      message: "Notes match the search query retrieved succussfully",
    });
  } catch (e) {
    return res.status(500).json({
      error: true,
      message: "Internal server Error",
    });
  }
}

module.exports = {
  addNote,
  deleteNote,
  editNote,
  getAllNotes,
  searchNotes,
  updatePinned,
};
