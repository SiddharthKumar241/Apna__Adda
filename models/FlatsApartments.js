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

module.exports = mongoose.model('FlatsApartments', categorySchema, 'flats_apartments');
