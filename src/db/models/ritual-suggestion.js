const mongoose = require('mongoose');

const SuggestionSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
    },
    slack_team_id: String,
  },
  {
    discriminatorKey: 'ritual_type',
    collection: 'ritual_suggestions',
    timestamps: true,
  },
);

module.exports = mongoose.model('Suggestion', SuggestionSchema);
