const mongoose = require('mongoose');
const chalk = require('chalk');
const Workflow = require('../workflow-instance');

const BirthdaySchema = new mongoose.Schema({
  day: String,
  month: String,
  year: String,
});

/* eslint-disable func-names */
BirthdaySchema.statics.createBirthday = async function (author) {
  try {
    const newBirthday = await this.create({
      author,
      workflow_type: 'BOBirthday',
    });
    return newBirthday;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable camelcase */

module.exports = Workflow.discriminator('BOBirthday', BirthdaySchema);
