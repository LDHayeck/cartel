const mongoose = require('mongoose');
const chalk = require('chalk');
const Suggestion = require('./ritual-suggestion');

const OscarSuggestionSchema = new mongoose.Schema(
  {
    text: String,
  },
  { timestamps: true },
);

/* eslint-disable */
OscarSuggestionSchema.statics.createOscarSuggestion = async function (text, author, slack_team_id) { 
  try {
    const newOscarSuggestion = await this.create({
      author,
      slack_team_id,
      ritual_type: 'OscarSuggestion',
      text,
    });
    return newOscarSuggestion;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

OscarSuggestionSchema.statics.getOscarSuggestionById = async function (idSuggestion) {
    try {
        const foundSuggestion = await this.findById(idSuggestion);
        return foundSuggestion;
    } catch (err) {
        console.error(chalk.red('Error ✗'), err);
        return err;
    }
}
/* eslint-enable */

module.exports = Suggestion.discriminator('OscarSuggestion', OscarSuggestionSchema);
