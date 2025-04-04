const mongoose = require('mongoose');
const chalk = require('chalk');
const Workflow = require('./workflow-instance');

const AddSchema = new mongoose.Schema({
  amount: Number,
  cagnotteName: String,
  reason: String,
  deadline: Date,
});

/* eslint-disable func-names */
AddSchema.statics.addTo = async function (author, cagnotteName) {
  try {
    const newCagnotte = await this.create({
      author,
      cagnotteName,
      workflow_type: 'AddToCagnotte',
    });
    return newCagnotte;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

module.exports = Workflow.discriminator('AddToCagnotte', AddSchema);
