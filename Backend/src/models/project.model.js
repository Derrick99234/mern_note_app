const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const projectSchema = new Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, default: "novel" }, // novel, youtube, blog, other
  description: { type: String }, // Global context/summary of the project
  createdOn: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Project", projectSchema);
