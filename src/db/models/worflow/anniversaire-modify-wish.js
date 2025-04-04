const mongoose = require('mongoose');
const chalk = require('chalk');
const Workflow = require('./workflow-instance');

const ModifyWishSchema = new mongoose.Schema({
  owner: String,
  wish: String,
});

/* eslint-disable func-names */
ModifyWishSchema.statics.updateWish = async function (author, owner) {
  try {
    const newAnnivWish = await this.create({
      author,
      workflow_type: 'ModifyWish',
      owner,
    });
    return newAnnivWish;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

/* eslint-disable func-names */
ModifyWishSchema.statics.getAnnivById = async function (idAnniv) {
  try {
    const foundAnniv = await this.findById(idAnniv);
    return foundAnniv;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

module.exports = Workflow.discriminator('ModifyWish', ModifyWishSchema);
