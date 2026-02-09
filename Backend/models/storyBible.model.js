const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const storyBibleSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: String, required: true },
  tone: { type: String, default: "" },
  rules: { type: String, default: "" },
  characters: { type: Array, default: [] },
  locations: { type: Array, default: [] },
  timeline: { type: Array, default: [] },
  glossary: { type: Array, default: [] },
  notes: { type: String, default: "" },
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

storyBibleSchema.index({ projectId: 1, userId: 1 }, { unique: true });

storyBibleSchema.pre("save", function (next) {
  this.updatedOn = new Date();
  next();
});

module.exports = mongoose.model("StoryBible", storyBibleSchema);
