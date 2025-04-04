const mongoose = require('mongoose');

const RitualSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
    },
    slack_team_id: String,
  },
  {
    discriminatorKey: 'ritual_type',
    collection: 'ritual_instances',
    timestamps: true,
  },
);

module.exports = mongoose.model('RitualInstance', RitualSchema);
