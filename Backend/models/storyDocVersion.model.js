const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const storyDocVersionSchema = new Schema({
  docId: { type: Schema.Types.ObjectId, ref: "StoryDoc", required: true },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: String, required: true },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  saveReason: { type: String, default: "manual" },
  createdOn: { type: Date, default: Date.now },
});

storyDocVersionSchema.index({ docId: 1, createdOn: -1 });

module.exports = mongoose.model("StoryDocVersion", storyDocVersionSchema);
