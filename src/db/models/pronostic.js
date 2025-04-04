const mongoose = require('mongoose');
const Ritual = require('./ritual-instance');

const PronosticSchema = new mongoose.Schema({
  // recipient: { type: mongoose.SchemaType.ObjectId, ref: 'Member' },
  deadline: Date,
  history: [String],
});

module.exports = Ritual.discriminator('Pronostic', PronosticSchema);
