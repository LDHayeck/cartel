/* eslint-disable max-len */
const _ = require('lodash');
const chalk = require('chalk');
const SlackInstance = require('../utils/slack-instance');
const CagnotteController = require('./cagnotte.controller');
const TrainEventController = require('./train-event.controller');
const AnniversaireController = require('./anniversaire.controller');
const SecretSantaController = require('./secret-santa.controller');
const OscarController = require('./oscar.controller');
const MsgService = require('../utils/messages/messages-service');
const Cartel = require('../db/models/cartel');

// Helper functions
function findAttachment(message, actionCallbackId) {
  return message.attachments.find(a => a.callback_id === actionCallbackId);
}

function acknowledgeActionFromMessage(originalMessage, actionCallbackId, ackText, isError) {
  const message = _.cloneDeep(originalMessage);
  const attachment = findAttachment(message, actionCallbackId);
  delete attachment.actions;
  const emoji = isError ? ':x:' : ':white_check_mark:';
  attachment.text = `${emoji} ${ackText}`;
  return message;
}

exports.chooseAction = async (payload, respond) => {
  const channel = payload.channel.id;
  const user = payload.user.id;
  const slack = await SlackInstance.getClientByTeamId(payload.team.id);
  if (!slack) {
    return console.error('No authorization found for this team. Did you install this app again after restarting?');
  }
  const selectedAction = payload.actions[0].name;
  if (selectedAction === 'Cagnottes') {
    try {
      const cagnottesMsg = await CagnotteController.onListCagnottesAction(payload.team.id);
      cagnottesMsg.channel = channel;
      slack.chat
        .postMessage(cagnottesMsg);
    } catch (err) {
      console.error(chalk.red('Error ✗'), err);
      respond({ text: 'Oups, something went wrong' });
    }
  } else if (selectedAction === 'TrainEvent') {
    try {
      const trainsMsg = await TrainEventController.onListTrainsAction(payload.team.id, user);
      trainsMsg.channel = channel;
      slack.chat
        .postMessage(trainsMsg);
    } catch (err) {
      console.error(chalk.red('Error ✗'), err);
      respond({ text: 'Oups, something went wrong' });
    }
  } else if (selectedAction === 'Anniversaires') {
    try {
      const annivMsg = await AnniversaireController.onListAnniversaireAction(
        payload.team.id,
        payload.user.id,
      );
      annivMsg.channel = channel;
      slack.chat
        .postMessage(annivMsg);
    } catch (err) {
      console.error(chalk.red('Error ✗'), err);
      respond({ text: 'Oups, something went wrong' });
    }
  } else if (selectedAction === 'Oscar') {
    try {
      const oscarMsg = await OscarController.listOscarOfTheWeekAction(payload.team.id,
        payload.user.id);
      oscarMsg.channel = channel;
      slack.chat
        .postMessage(oscarMsg);
    } catch (err) {
      console.error(chalk.red('Error ✗'), err);
      respond({ text: 'Oups, something went wrong' });
    }
  } else if (selectedAction === 'SecretSanta') {
    try {
      const cartelSecretSanta = await Cartel.getSecretSantaByTeamId(payload.team.id);
      if (cartelSecretSanta.ritual_instances.length > 0) {
        const SecretSantaMsg = await SecretSantaController.onListSecretSantaAction(payload.team.id, payload.user.id);
        SecretSantaMsg.channel = channel;
        slack.chat.postMessage(SecretSantaMsg);
      } else {
        const dialogMsg = await MsgService.getSecretSantaMessage('secret-santa-new-dialog-open', { triggerId: payload.trigger_id });
        slack.dialog.open(dialogMsg);
      }
    } catch (err) {
      console.error(chalk.red('Error ✗'), err);
      respond({ text: 'Oups, something went wrong' });
    }
  } else {
    const errorMessage = acknowledgeActionFromMessage(
      payload.original_message,
      'onboard:start',
      `Oups, *${selectedAction}* est en cours de développement :nerd_face:`,
      true,
    );
    errorMessage.channel = channel;
    slack.chat
      .postMessage(errorMessage);
  }
  return payload.original_message;
};
