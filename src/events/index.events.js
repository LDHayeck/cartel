/* eslint no-console: ["error", { allow: ["warn", "error"] }] */
const EventsApi = require('@slack/events-api');
const { ErrorCode } = require('@slack/client');
const SlackInstance = require('../utils/slack-instance');
const Workflow = require('../db/models/worflow/workflow-instance');
const MsgService = require('../utils/messages/messages-service');
const Cartel = require('../db/models/cartel');
const CagnotteController = require('../controllers/cagnotte.controller');
const AnniversaireController = require('../controllers/anniversaire.controller');
const OscarController = require('../controllers/oscar.controller');
// Initialize event adapter using oauth token (NB: Udpate it when reinstalling the bot)
const slackEvents = EventsApi.createEventAdapter(process.env.SLACK_SIGNING_SECRET, {
  includeBody: true,
});

// Greeting any user that says "hi" and is a Direct Message
slackEvents.on('message', async (message, body) => {
  // Only deal with messages that have no subtype (plain messages) and contain 'hi'
  if (!message.subtype && message.channel_type === 'im') {
    try {
      const teamId = body.team_id;
      const userId = message.user;
      const textMsg = message.text;
      const slack = await SlackInstance.getClientByTeamId(teamId);
      if (!slack) {
        return console.error('No authorization found for this team. Did you install this app again after restarting?');
      }
      const menuWordings = await MsgService.getWhiteList('white-list-words');
      // ['hi', 'Hi', 'menu'];
      if (menuWordings.indexOf(textMsg) > -1) {
        const respMsg = await MsgService.getCommonMessage('list-rituals', { channel: message.channel });
        return slack.chat
          .postMessage(respMsg)
          .catch(console.error);
      }
      // Check if the user has created a new discussion workflow
      const foundWF = await Workflow.findWFByAuthor(userId);
      if (foundWF && foundWF.workflow_type === 'NewCagnotte' && !foundWF.name) {
        foundWF.name = textMsg;
        await foundWF.save();
        const mapping = {
          channel: message.channel,
        };
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-disc-get-description', mapping);
        return slack.chat
          .postMessage(respMsg)
          .catch(console.error);
      }

      if (foundWF && foundWF.workflow_type === 'NewCagnotte' && !foundWF.description) {
        foundWF.description = textMsg;
        await foundWF.save();
        const mapping = {
          channel: message.channel,
          wfId: foundWF.id,
          userId,
          wfText: foundWF.name,
          wfDescription: textMsg,
        };
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-disc-ok-question-validation', mapping);
        return slack.chat
          .postMessage(respMsg)
          .catch(console.error);
      }

      if (foundWF && foundWF.workflow_type === 'AddToCagnotte') {
        CagnotteController.addToCagnotteWF(
          slack, foundWF,
          textMsg, message.channel,
          teamId, userId,
        );
      }

      if (foundWF && foundWF.workflow_type === 'AnnivWish') {
        AnniversaireController.addWishWF(foundWF, textMsg);

        const mapping = {
          channel: message.channel,
          wfId: foundWF.id,
          wfOwner: foundWF.owner,
          wfText: textMsg,
        };

        const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-question-validation', mapping);
        return slack.chat
          .postMessage(respMsg)
          .catch(console.error);
      }

      if (foundWF && foundWF.workflow_type === 'ModifyWish') {
        AnniversaireController.modifyWishWF(foundWF, textMsg);

        const mapping = {
          channel: message.channel,
          wfId: foundWF.id,
          wfOwner: foundWF.owner,
          wfText: textMsg,
        };
        const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-question-modif', mapping);
        return slack.chat
          .postMessage(respMsg)
          .catch(console.error);
      }

      if (foundWF && foundWF.workflow_type === 'OscarSuggestionWF') {
        OscarController.suggestOscarWF(foundWF, textMsg);
        const mapping = {
          channel: message.channel,
          wfId: foundWF.id,
          wfText: textMsg,
        };
        const respMsg = await MsgService.getAnniversaireMessage('oscar-new-suggestion-ok-validate', mapping);
        return slack.chat
          .postMessage(respMsg)
          .catch(console.error);
      }
    } catch (err) {
      console.error(err);
      return err;
    }
  }
  return null;
});

slackEvents.on('team_join', async (event) => {
  const teamId = event.user.team_id;
  const userId = event.user.id;
  const isBot = event.user.is_bot;
  const realName = event.user.real_name;
  // eslint-disable-next-line prefer-destructuring
  const email = event.user.profile.email;
  const isAdmin = event.user.is_admin;
  const isOwner = event.user.is_owner;
  const title = event.user.profile.title;

  const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
  const teamName = currentCartel.slack_name;
  if (currentCartel) {
    if (!isBot) {
      currentCartel.members.push({
        slack_uid: userId,
        name: realName,
        email,
        admin: isAdmin,
        owner: isOwner,
        birthdate: '',
        title,
      });
    }
    await currentCartel.save();
  }
  const slack = await SlackInstance.getClientByTeamId('T7Z84HH3N');
  slack.chat.postMessage({
    channel: 'member_join',
    text: 'New Member Join',
    attachments: [{
      color: '#5b9aff',
      text: `*Entreprise* : ${teamName}\n*Nom* : ${realName}\n*ID* : ${userId}`,
    }],
  });
});

slackEvents.on('app_uninstalled', async (event, body) => {
  const teamId = body.team_id;
  const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
  const teamName = currentCartel.slack_name;
  const slack = await SlackInstance.getClientByTeamId('T7Z84HH3N');
  slack.chat.postMessage({
    channel: 'member_join',
    text: 'Bot Uninstall',
    attachments: [{
      color: '#FF0000',
      text: `*Entreprise* : ${teamName}`,
    }],
  });
});

// Handle errors
slackEvents.on('error', (error) => {
  if (error.code === ErrorCode.TOKEN_VERIFICATION_FAILURE) {
    // NB: error got `body` propery containing the request body which failed verification.
    console.error(`An unverified request was sent to the Slack events Request URL. Request body: \
${JSON.stringify(error.body)}`);
  } else {
    console.error(`An error occurred while handling a Slack event: ${error.message}`);
  }
});

module.exports = slackEvents;
