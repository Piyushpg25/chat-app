const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: String,
    required: true
  },
  // ── Text content ──
  content: {
    type: String,
    default: ''
  },
  // ── Media fields (image/video/file) ──
  mediaUrl:  { type: String, default: null },
  mediaType: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
  mediaName: { type: String, default: null },
  mediaSize: { type: Number, default: null },
  // ── Edit tracking ──
  edited: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 // 24 ghante baad auto delete
  }
});

module.exports = mongoose.model('Message', messageSchema);