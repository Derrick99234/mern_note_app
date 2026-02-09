const express = require("express");
const { authenticateToken } = require("../middleware/authenticateToken");
const Project = require("../../models/project.model");
const StoryDoc = require("../../models/storyDoc.model");
const StoryBible = require("../../models/storyBible.model");
const ProjectMemory = require("../../models/projectMemory.model");
const WritingSource = require("../../models/writingSource.model");
const WritingStyle = require("../../models/writingStyle.model");
const StoryDocVersion = require("../../models/storyDocVersion.model");

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
  const { title, content, saveReason } = req.body;

  try {
    const doc = await StoryDoc.findOne({ _id: docId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: true, message: "Document not found" });

    const incomingTitle = title !== undefined ? String(title) : undefined;
    const incomingContent = content !== undefined ? String(content) : undefined;
    const reason = String(saveReason || "manual");

    const shouldVersion =
      incomingContent !== undefined &&
      incomingContent !== doc.content &&
      doc.type === "document";

    if (shouldVersion) {
      const lastVersion = await StoryDocVersion.findOne({ docId: doc._id }).sort({ createdOn: -1 });
      const now = Date.now();
      const lastMs = lastVersion ? new Date(lastVersion.createdOn).getTime() : 0;
      const minGapMs = reason === "manual" ? 0 : 2 * 60 * 1000;
      if (!lastVersion || now - lastMs >= minGapMs) {
        await StoryDocVersion.create({
          docId: doc._id,
          projectId: doc.projectId,
          userId: req.user._id,
          title: doc.title,
          content: doc.content,
          saveReason: reason,
        });
      }
    }

    if (incomingTitle !== undefined) doc.title = incomingTitle;
    if (incomingContent !== undefined) doc.content = incomingContent;

    await doc.save();
    return res.json({ error: false, doc, message: "Document updated" });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.get("/docs/:docId/versions", authenticateToken, async (req, res) => {
  const { docId } = req.params;
  try {
    const doc = await StoryDoc.findOne({ _id: docId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: true, message: "Document not found" });

    const versions = await StoryDocVersion.find({ docId: doc._id })
      .sort({ createdOn: -1 })
      .limit(30)
      .select("_id createdOn title saveReason content");

    return res.json({ error: false, versions });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.post("/docs/:docId/restore/:versionId", authenticateToken, async (req, res) => {
  const { docId, versionId } = req.params;
  try {
    const doc = await StoryDoc.findOne({ _id: docId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: true, message: "Document not found" });

    const version = await StoryDocVersion.findOne({ _id: versionId, docId: doc._id });
    if (!version) return res.status(404).json({ error: true, message: "Version not found" });

    await StoryDocVersion.create({
      docId: doc._id,
      projectId: doc.projectId,
      userId: req.user._id,
      title: doc.title,
      content: doc.content,
      saveReason: "restore",
    });

    doc.title = version.title || doc.title;
    doc.content = version.content || "";
    await doc.save();

    return res.json({ error: false, doc });
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

router.get("/projects/:projectId/bible", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const bible =
      (await StoryBible.findOne({ projectId, userId: req.user._id })) ||
      (await StoryBible.create({ projectId, userId: req.user._id }));
    return res.json({ error: false, bible });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.put("/projects/:projectId/bible", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const bible =
      (await StoryBible.findOne({ projectId, userId: req.user._id })) ||
      (await StoryBible.create({ projectId, userId: req.user._id }));

    const { tone, rules, characters, locations, timeline, glossary, notes } = req.body || {};
    if (tone !== undefined) bible.tone = String(tone || "");
    if (rules !== undefined) bible.rules = String(rules || "");
    if (notes !== undefined) bible.notes = String(notes || "");
    if (Array.isArray(characters)) bible.characters = characters;
    if (Array.isArray(locations)) bible.locations = locations;
    if (Array.isArray(timeline)) bible.timeline = timeline;
    if (Array.isArray(glossary)) bible.glossary = glossary;

    await bible.save();
    return res.json({ error: false, bible });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.get("/projects/:projectId/memory", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const memory =
      (await ProjectMemory.findOne({ projectId, userId: req.user._id })) ||
      (await ProjectMemory.create({ projectId, userId: req.user._id }));
    return res.json({ error: false, memory });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.put("/projects/:projectId/memory", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const memory =
      (await ProjectMemory.findOne({ projectId, userId: req.user._id })) ||
      (await ProjectMemory.create({ projectId, userId: req.user._id }));
    const { styleGuidelines, openThreads, keyFacts, progress, sessionSummaries } = req.body || {};
    if (styleGuidelines !== undefined) memory.styleGuidelines = String(styleGuidelines || "");
    if (Array.isArray(openThreads)) memory.openThreads = openThreads;
    if (Array.isArray(keyFacts)) memory.keyFacts = keyFacts;
    if (progress && typeof progress === "object") memory.progress = progress;
    if (Array.isArray(sessionSummaries)) memory.sessionSummaries = sessionSummaries;
    await memory.save();
    return res.json({ error: false, memory });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.get("/projects/:projectId/sources", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const sources = await WritingSource.find({ projectId, userId: req.user._id }).sort({
      createdOn: -1,
    });
    return res.json({ error: false, sources });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.post("/projects/:projectId/sources", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { docId, type, title, url, contentText } = req.body || {};
  try {
    const source = await WritingSource.create({
      projectId,
      userId: req.user._id,
      docId: docId || null,
      type: String(type || "url"),
      title: String(title || ""),
      url: String(url || ""),
      contentText: String(contentText || ""),
    });
    return res.json({ error: false, source });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.delete("/sources/:sourceId", authenticateToken, async (req, res) => {
  const { sourceId } = req.params;
  try {
    await WritingSource.deleteOne({ _id: sourceId, userId: req.user._id });
    return res.json({ error: false });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.get("/projects/:projectId/style", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const style =
      (await WritingStyle.findOne({ projectId, userId: req.user._id })) ||
      (await WritingStyle.create({ projectId, userId: req.user._id }));
    return res.json({ error: false, style });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

router.put("/projects/:projectId/style", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const style =
      (await WritingStyle.findOne({ projectId, userId: req.user._id })) ||
      (await WritingStyle.create({ projectId, userId: req.user._id }));
    const { guidelines, doList, dontList, examples } = req.body || {};
    if (guidelines !== undefined) style.guidelines = String(guidelines || "");
    if (Array.isArray(doList)) style.doList = doList;
    if (Array.isArray(dontList)) style.dontList = dontList;
    if (Array.isArray(examples)) style.examples = examples;
    await style.save();
    return res.json({ error: false, style });
  } catch (err) {
    return res.status(500).json({ error: true, message: "Internal Server Error" });
  }
});

module.exports = router;
