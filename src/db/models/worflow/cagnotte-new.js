const mongoose = require('mongoose');
const chalk = require('chalk');
const Workflow = require('./workflow-instance');

const CagnotteSchema = new mongoose.Schema({
  amount: Number,
  name: String,
  description: String,
  deadline: Date,
});

/* eslint-disable func-names */
CagnotteSchema.statics.createCagnotte = async function (author) {
  try {
    const newCagnotte = await this.create({
      author,
      workflow_type: 'NewCagnotte',
    });
    return newCagnotte;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

CagnotteSchema.statics.getCagnotteById = async function (idCagnotte) {
  try {
    const foundCagnotte = await this.findById(idCagnotte);
    return foundCagnotte;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable camelcase */

module.exports = Workflow.discriminator('NewCagnotte', CagnotteSchema);
