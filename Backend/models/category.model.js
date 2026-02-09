const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const categorySchema = new Schema({
  name: { type: String, required: true },
  scope: { type: String, enum: ["global", "user"], required: true },
  userId: { type: String, default: null },
  createdOn: { type: String, default: new Date().getTime() },
});

categorySchema.index({ scope: 1, userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
