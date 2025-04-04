const mongoose = require('mongoose');
const chalk = require('chalk');
const Ritual = require('./ritual-instance');

const candidateSchema = new mongoose.Schema(
  {
    slack_uid: String,
    voteCount: Number,
    voters: [String],
  },
  { timestamps: true },
);

const OscarSchema = new mongoose.Schema({
  question_url: String,
  postDate: Date,
  voters: [String],
  candidates: [candidateSchema],
});

/* eslint-disable func-names */
OscarSchema.statics.createOscar = async function (question, postDate , author, slack_team_id) { /* eslint-disable-line */
  try {
    const newOscar = await this.create({
      author,
      slack_team_id,
      ritual_type: 'Oscar',
      question,
      postDate,
    });
    return newOscar;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

OscarSchema.statics.getOscarById = async function (idOscar) {
  try {
    const foundOscar = await this.findById(idOscar);
    return foundOscar;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

module.exports = Ritual.discriminator('Oscar', OscarSchema);
