const mongoose = require('mongoose');
const chalk = require('chalk');

const MessageSpecSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    value: {},
  },
  { timestamps: true },
);

const RitualSpecsSchema = new mongoose.Schema(
  {
    ritual_type: {
      type: String,
      required: true,
    },
    messages: [MessageSpecSchema],
  },
  {
    collection: 'ritual_specs',
    timestamps: true,
  },
);

/* eslint-disable func-names */
RitualSpecsSchema.statics.createRitualSpecs = async function (type) {
  try {
    const newCagnotte = await this.create({
      ritual_type: type,
    });
    return newCagnotte;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
RitualSpecsSchema.statics.getSpecsByRitual = async function (type) {
  try {
    const foundRitualSpecs = await this.findOne({ ritual_type: type });
    return foundRitualSpecs;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
/* eslint-enable camelcase */

module.exports = mongoose.model('RitualSpec', RitualSpecsSchema);
