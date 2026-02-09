const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const writingStyleSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: String, required: true },
  guidelines: { type: String, default: "" },
  doList: { type: Array, default: [] },
  dontList: { type: Array, default: [] },
  examples: { type: Array, default: [] },
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

writingStyleSchema.index({ projectId: 1, userId: 1 }, { unique: true });

writingStyleSchema.pre("save", function (next) {
  this.updatedOn = new Date();
  next();
});

module.exports = mongoose.model("WritingStyle", writingStyleSchema);
