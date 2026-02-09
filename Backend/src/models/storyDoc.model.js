const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const storyDocSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: "StoryDoc", default: null }, // For folder structure
  title: { type: String, required: true },
  content: { type: String, default: "" },
  type: { type: String, default: "document" }, // document, folder
  order: { type: Number, default: 0 },
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("StoryDoc", storyDocSchema);
