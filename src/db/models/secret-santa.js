const mongoose = require('mongoose');
const chalk = require('chalk');
const Ritual = require('./ritual-instance');


const ParticipantSchema = new mongoose.Schema({
  // Participants
  slack_uid: String,
  slack_name: String,
  randomClassifier: Number,
  didCheckSecretSanta: Boolean,
  reciever_id: String,
  reciever_name: String,
  gift_wish: [String],
});


const SecretSantaSchema = new mongoose.Schema({
  inscriptionStop: Boolean,
  maxBudget: Number,
  eventDate: Date,
  channelTarget: String,
  welcomeMessage: String,
  participants: [ParticipantSchema],
  warnOneWeek: Boolean,
  warnOneDay: Boolean,
  // Secret Santa Schema
});

/* eslint-disable func-names */
SecretSantaSchema.statics.createSecretSanta = async function (author, slack_team_id, maxBudget, eventDate, welcomeMessage, channelTarget) { /* eslint-disable-line */
  try {
    const newSecretSanta = await this.create({
      author,
      slack_team_id,
      ritual_type: 'SecretSanta',
      inscriptionStop: false,
      maxBudget,
      eventDate,
      welcomeMessage,
      channelTarget,
      warnOneWeek: false,
      warnOneDay: false,
    });
    return newSecretSanta;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

SecretSantaSchema.statics.getSecretSantaById = async function (idSecretSanta) {
  try {
    const foundSecretSanta = await this.findById(idSecretSanta);
    return foundSecretSanta;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable func-names */

module.exports = Ritual.discriminator('SecretSanta', SecretSantaSchema);
