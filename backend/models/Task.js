const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Task text is required'],
    trim: true,
    maxlength: 200
  },
  completed: {
    type: Boolean,
    default: false
  },
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true
  },
  createdDate: {
    type: String, // "YYYY-MM-DD" — matches the midnight-rollover logic in the frontend
    default: () => new Date().toISOString().slice(0, 10)
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);