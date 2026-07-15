const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name:{ type: String, required: true, trim: true},
    email:{ type: String, required: true, unique: true, lowercase: true, trim: true},
    password:{ type: String, required: true, minlength:6}
},{timestamps: true});

// Runs automatically right before a user is saved — hashes the password
// so the plain text version never touches the database.

userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
})

// used during login to check a typed password against the stored hashed
userSchema.methods.comparePassword = function(candidate){
   return bcrypt.compare(candidate, this.password);
}

module.exports = mongoose.model('User',userSchema);