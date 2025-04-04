const mongoose = require('mongoose');
const chalk = require('chalk');
const Cagnotte = require('./cagnotte');
const TrainEvent = require('./train-event');
const Anniversaire = require('./anniversaire');
const CartelMember = require('./cartel-member');
const Oscar = require('./oscar');
const SecretSanta = require('./secret-santa');

const enums = {
  RITUALS: ['Cagnotte', 'Pronostic', 'Anniversaire'],
};

const CartelMemberSchema = new mongoose.Schema(
  {
    slack_uid: {
      type: String,
      required: true,
    },
    name: String,
    birthdate: String,
    email: String,
    admin: Boolean,
    owner: Boolean,
    title: String,
  },
  { timestamps: true },
);

const CartelSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    slack_team_id: {
      type: String,
      required: true,
    },
    slack_api_token: {
      type: String,
      required: true,
    },
    slack_name: {
      type: String,
      required: true,
    },
    slack_team_token: String,
    slack_installer_name: String,
    slack_installer_id: String,
    members: [CartelMemberSchema],
    available_rituals: [{ type: String, enums: enums.RITUALS }],
    ritual_instances: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'RitualInstance' },
    ],
  },
  { timestamps: true },
);

/* eslint-disable func-names */
CartelSchema.statics.getCartelWithRitualsByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'ritual_instances' });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

/* eslint-disable func-names */
CartelSchema.statics.getCagnottesByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'ritual_instances', model: Cagnotte });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

CartelSchema.statics.getTrainEventByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'ritual_instances', model: TrainEvent });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

CartelSchema.statics.getCartelMemberByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'cartel', model: CartelMember });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

CartelSchema.statics.getAnniversaireByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'ritual_instances', model: Anniversaire });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

CartelSchema.statics.getOscarByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'ritual_instances', model: Oscar });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

CartelSchema.statics.getSecretSantaByTeamId = async function (teamId) {
  try {
    const foundCartel = await this.findOne({ slack_team_id: teamId })
      .populate({ path: 'ritual_instances', model: SecretSanta });
    return foundCartel;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

/* eslint-enable func-names */

module.exports = mongoose.model('Cartel', CartelSchema);
