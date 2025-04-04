const { WebClient } = require('@slack/client');
const Cartel = require('../db/models/cartel');
// Helpers to cache and lookup appropriate client
const clients = {};

exports.getClientByTeamId = async (teamId) => { // eslint-disable-line consistent-return
  try {
    const foundTeam = await Cartel.findOne({ slack_team_id: teamId });
    if (!clients[teamId] && foundTeam.slack_team_id === teamId) {
      clients[teamId] = new WebClient(foundTeam.slack_api_token);
    }
    if (clients[teamId]) {
      return clients[teamId];
    }
  } catch (err) {
    return err;
  }
};
