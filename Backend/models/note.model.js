const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const noteSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: Array, default: [] },
  isPinned: { type: Boolean, default: false },
  userId: { type: String, default: false },
  createdOn: { type: String, default: new Date().getTime() },
});

module.exports = mongoose.model("Note", noteSchema);
