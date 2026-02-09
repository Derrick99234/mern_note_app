const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const writingSourceSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: String, required: true },
  docId: { type: Schema.Types.ObjectId, ref: "StoryDoc", default: null },
  type: { type: String, default: "url" },
  title: { type: String, default: "" },
  url: { type: String, default: "" },
  contentText: { type: String, default: "" },
  createdOn: { type: Date, default: Date.now },
});

writingSourceSchema.index({ projectId: 1, userId: 1, createdOn: -1 });

module.exports = mongoose.model("WritingSource", writingSourceSchema);
