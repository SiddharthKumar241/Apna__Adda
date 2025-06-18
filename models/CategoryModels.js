const mongoose = require("mongoose");

const sharedSchema = {
  city: String,
  title: String,
  type: String,
  rent: String,
  area: String,
  image: String,
  dateAdded: String
};

const Authority_Plots = mongoose.model("Authority_Plots", new mongoose.Schema(sharedSchema, { collection: "Authority_Plots" }));
const Freehold_Property = mongoose.model("Freehold_Property", new mongoose.Schema(sharedSchema, { collection: "Freehold_Property" }));
const Industrial_Plots = mongoose.model("Industrial_Plots", new mongoose.Schema(sharedSchema, { collection: "Industrial_Plots" }));
const Flats_Apartments = mongoose.model("Flats_Apartments", new mongoose.Schema(sharedSchema, { collection: "Flats_Apartments" }));

module.exports = {
  Authority_Plots,
  Freehold_Property,
  Industrial_Plots,
  Flats_Apartments
};
