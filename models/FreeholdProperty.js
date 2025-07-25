const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  city: String,
  title: String,
  type: String,
  rent: Number,
  dateAdded: String,
  area: String,
  image: String
});

module.exports = mongoose.model('FreeholdProperty', categorySchema, 'freehold_property');
