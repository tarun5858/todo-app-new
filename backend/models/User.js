const mongoose = require('mongoose'); //mongoose — defines the shape of documents in MongoDB.
const bcrypt = require('bcryptjs'); // bcrypt — used to hash passwords so they're never stored as plain text.

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  googleId:{type: String, unique:true, sparse:true}
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.password || !this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
// pre('save', ...) — a "hook" that runs automatically right before any user document is saved to the database.
// this.isModified('password') — checks if the password field was just changed. Without this check, every single save (even unrelated edits) would re-hash an already-hashed password, breaking login.
// bcrypt.genSalt(10) — generates random "salt" data (makes each hash unique even for identical passwords).
// bcrypt.hash(...) — turns the plain password into an irreversible scrambled hash. This hash is what actually gets saved — the real password is never stored anywhere.


userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
// Adds a custom method available on every user document. During login, you can't "un-hash" a password to check it — instead, bcrypt.compare() hashes the typed-in password the same way and checks if the two hashes match. Returns true/false.

module.exports = mongoose.model('User', userSchema);
// Turns the schema into a usable Mongoose model, exported so authController.js can do User.create(...), User.findOne(...), etc.
