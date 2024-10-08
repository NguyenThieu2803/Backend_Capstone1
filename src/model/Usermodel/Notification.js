const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: String,
  user_id: String,
  message: String,
  notification_type: String,
  created_at: Date
});

module.exports = mongoose.model('Notes', notificationSchema);
