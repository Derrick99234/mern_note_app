const express = require("express");
const { authenticateToken } = require("../middleware/authenticateToken");
const Project = require("../models/project.model");
const StoryDoc = require("../models/storyDoc.model");

const router = express.Router();

// --- Projects ---

// Get all projects for user
router.get("/projects", authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id }).sort({ createdOn: -1 });
    return res.json({ error: false, projects });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Create new project
router.post("/projects", authenticateToken, async (req, res) => {
  const { title, type, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: true, message: "Title is required" });
  }

  try {
    const project = new Project({
      title,
      type: type || "novel",
      description: description || "",
      userId: req.user._id,
    });
    await project.save();
    return res.json({ error: false, project, message: "Project created successfully" });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Delete project
router.delete("/projects/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await Project.findOne({ _id: projectId, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ error: true, message: "Project not found" });
    }
    // Delete all docs in project
    await StoryDoc.deleteMany({ projectId });
    await Project.deleteOne({ _id: projectId });

    return res.json({ error: false, message: "Project deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// --- Story Docs (Documents/Chapters) ---

// Get all docs for a project (flat list, frontend builds hierarchy if needed)
router.get("/projects/:projectId/docs", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    // Verify ownership
    const project = await Project.findOne({ _id: projectId, userId: req.user._id });
    if (!project) return res.status(404).json({ error: true, message: "Project not found" });

    const docs = await StoryDoc.find({ projectId }).sort({ order: 1 });
    return res.json({ error: false, docs });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Create new doc/chapter
router.post("/projects/:projectId/docs", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { title, parentId, type } = req.body;

  if (!title) return res.status(400).json({ error: true, message: "Title is required" });

  try {
    const project = await Project.findOne({ _id: projectId, userId: req.user._id });
    if (!project) return res.status(404).json({ error: true, message: "Project not found" });

    // Find max order
    const lastDoc = await StoryDoc.findOne({ projectId, parentId: parentId || null }).sort({ order: -1 });
    const order = lastDoc ? lastDoc.order + 1 : 0;

    const doc = new StoryDoc({
      projectId,
      userId: req.user._id,
      title,
      parentId: parentId || null,
      type: type || "document",
      order,
      content: "",
    });

    await doc.save();
    return res.json({ error: false, doc, message: "Document created" });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Update doc content/title
router.put("/docs/:docId", authenticateToken, async (req, res) => {
  const { docId } = req.params;
  const { title, content } = req.body;

  try {
    const doc = await StoryDoc.findOne({ _id: docId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: true, message: "Document not found" });

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;

    await doc.save();
    return res.json({ error: false, doc, message: "Document updated" });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

// Delete doc
router.delete("/docs/:docId", authenticateToken, async (req, res) => {
  const { docId } = req.params;
  try {
    const doc = await StoryDoc.findOne({ _id: docId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: true, message: "Document not found" });

    // Ideally recursively delete children if folder, for now just delete the doc
    // If it's a folder, children become orphans or we should delete them. 
    // Let's simple delete children for now.
    await StoryDoc.deleteMany({ parentId: docId });
    await StoryDoc.deleteOne({ _id: docId });

    return res.json({ error: false, message: "Document deleted" });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

module.exports = router;
