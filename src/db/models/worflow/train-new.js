const mongoose = require('mongoose');
const chalk = require('chalk');
const Workflow = require('./workflow-instance');

const TrainSchema = new mongoose.Schema({
  name: String,
  author: String,
  deadline: Date,
});

/* eslint-disable func-names */
TrainSchema.statics.createTrain = async function (author) {
  try {
    const newTrain = await this.create({
      author,
      workflow_type: 'NewTrain',
    });
    return newTrain;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

TrainSchema.statics.getTrainById = async function (idCagnotte) {
  try {
    const foundTrain = await this.findById(idCagnotte);
    return foundTrain;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable camelcase */

module.exports = Workflow.discriminator('NewTrain', TrainSchema);
