const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  fullname: { type: String },
  email: { type: String },
  password: { type: String },
  createdOn: { type: Date, default: new Date().getTime() },
});

userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    const value = String(this.password || "");
    if (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$")) {
      return next();
    }
    const saltRounds = 10;
    this.password = await bcrypt.hash(value, saltRounds);
    return next();
  } catch (e) {
    return next(e);
  }
});

userSchema.methods.comparePassword = async function (plain) {
  const stored = String(this.password || "");
  const input = String(plain || "");
  const isHash =
    stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
  if (!isHash) return stored === input;
  return bcrypt.compare(input, stored);
};

module.exports = mongoose.model("User", userSchema);
