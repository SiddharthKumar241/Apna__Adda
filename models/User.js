const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Username: String,
  Email: String,
  Password: String
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'user');
