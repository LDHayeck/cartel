const mongoose = require('mongoose');
const chalk = require('chalk');
const Ritual = require('./ritual-instance');

const TrainEventSchema = new mongoose.Schema({
  name: String,
  deadline: Date,
  participants: [String],
  channelTarget: String,
  warnThirtyMins: Boolean,
  warnDDay: Boolean,
  warnOneWeek: Boolean,
  warnThreeWeeks: Boolean,
});

/* eslint-disable func-names */
TrainEventSchema.statics.createTrainEvent = async function (name, author, slack_team_id, deadline, channel) { /* eslint-disable-line */
  try {
    const newTrainEvent = await this.create({
      author,
      slack_team_id,
      deadline,
      ritual_type: 'TrainEvent',
      name,
      channelTarget: channel,
      participants: [author],
      warnThirtyMins: false,
      warnDDay: false,
      warnOneWeek: false,
      warnThreeWeeks: false,
    });
    return newTrainEvent;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

TrainEventSchema.statics.getTrainEventById = async function (idTrainEvent) {
  try {
    const foundTrainEvent = await this.findById(idTrainEvent);
    return foundTrainEvent;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

TrainEventSchema.statics.getTrainEventByName = async function (nameTrainEvent) {
  try {
    const foundTrainEvent = await this.findOne({ name: nameTrainEvent });
    return foundTrainEvent;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable camelcase */

module.exports = Ritual.discriminator('TrainEvent', TrainEventSchema);
