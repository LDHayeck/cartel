const mongoose = require('mongoose');
const chalk = require('chalk');
const Workflow = require('./workflow-instance');

const OscarSuggestionSchema = new mongoose.Schema({
  suggestion: String,
});

/* eslint-disable func-names */
OscarSuggestionSchema.statics.createOscarSuggestion = async function (author) {
  try {
    const newOscarSuggestion = await this.create({
      author,
      workflow_type: 'OscarSuggestionWF',
    });
    return newOscarSuggestion;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

OscarSuggestionSchema.statics.getOscarSuggestionById = async function (idSuggestion) {
  try {
    const foundOscarSuggestion = await this.findById(idSuggestion);
    return foundOscarSuggestion;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable camelcase */

module.exports = Workflow.discriminator('OscarSuggestionWF', OscarSuggestionSchema);
