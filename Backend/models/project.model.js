const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const projectSchema = new Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, default: "novel" },
  description: { type: String, default: "" },
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
});

projectSchema.pre("save", function (next) {
  this.updatedOn = new Date();
  next();
});

module.exports = mongoose.model("Project", projectSchema);
