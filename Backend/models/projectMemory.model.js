const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const projectMemorySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: String, required: true },
  styleGuidelines: { type: String, default: "" },
  openThreads: { type: Array, default: [] },
  keyFacts: { type: Array, default: [] },
  sessionSummaries: { type: Array, default: [] },
  progress: { type: Object, default: {} },
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

projectMemorySchema.index({ projectId: 1, userId: 1 }, { unique: true });

projectMemorySchema.pre("save", function (next) {
  this.updatedOn = new Date();
  next();
});

module.exports = mongoose.model("ProjectMemory", projectMemorySchema);
