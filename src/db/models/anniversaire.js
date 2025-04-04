const mongoose = require('mongoose');
const chalk = require('chalk');
const Ritual = require('./ritual-instance');


const WishSchema = new mongoose.Schema(
  {
    wish: String,
    author: String,
  },

  { timestamp: true },
);

const AnnivSchema = new mongoose.Schema(
  {
    owner: String, // { type: mongoose.SchemaType.ObjectId, ref: 'Member' },
    wishBDay: Boolean,
    didRemind: Boolean,
    wish: [WishSchema],
  },
);

/* eslint-disable func-names */
AnnivSchema.statics.createAnniv = async function (owner, author, slack_team_id) { /* eslint-disable-line */
  try {
    const newAnniv = await this.create({
      author,
      slack_team_id,
      ritual_type: 'Anniversaire',
      owner,
      wishBDay: false,
      didRemind: false,
    });
    return newAnniv;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

AnnivSchema.statics.getAnnivById = async function (idAnniv) {
  try {
    const foundAnniv = await this.findById(idAnniv);
    return foundAnniv;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

module.exports = Ritual.discriminator('Anniversaire', AnnivSchema);
