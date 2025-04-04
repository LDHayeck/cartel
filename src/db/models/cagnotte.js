const mongoose = require('mongoose');
const chalk = require('chalk');
const Ritual = require('./ritual-instance');

const HistorySchema = new mongoose.Schema(
  {
    amount: Number,
    author: String,
    reason: String,
  },
  { timestamps: true },
);

const CagnotteSchema = new mongoose.Schema({
  amount: Number,
  name: String,
  description: String,
  // recipient: { type: mongoose.SchemaType.ObjectId, ref: 'Member' },
  deadline: Date,
  history: [HistorySchema],
});

/* eslint-disable func-names */
CagnotteSchema.statics.createCagnotte = async function (name, author, slack_team_id, description) { /* eslint-disable-line */
  try {
    const newCagnotte = await this.create({
      author,
      slack_team_id,
      ritual_type: 'Cagnotte',
      name,
      description,
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
/* eslint-enable func-names */

module.exports = Ritual.discriminator('Cagnotte', CagnotteSchema);
