const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantName: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  numPeople: { type: Number, required: true },
  propertySelected: { type: String, required: true, trim: true },
  listedAmount: { type: Number, required: true },
  readyToPay: { type: Number, required: true },
  leaseTime: { type: String, required: true, trim: true },
  aadhaar: { type: String, required: true, trim: true },
  photo: { type: String, required: true },
  message: { type: String, trim: true } 
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema, 'tenant');
