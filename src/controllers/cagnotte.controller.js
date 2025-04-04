/* eslint-disable camelcase */
const _ = require('lodash');
const chalk = require('chalk');
const Cartel = require('../db/models/cartel');
const Cagnotte = require('../db/models/cagnotte');
const NewCagnotteWF = require('../db/models/worflow/cagnotte-new');
const AddCagnotteWF = require('../db/models/worflow/cagnotte-add');
const Workflow = require('../db/models/worflow/workflow-instance');
const MsgService = require('../utils/messages/messages-service');
const SlackInstance = require('../utils/slack-instance');


exports.selectCagnotteAction = async (payload, respond) => {
  try {
    const selectedAction = payload.actions[0].value;
    const testString = payload.callback_id;
    const regexGroups = testString.match(/(cagnotte:)(\w*)(:select)/);
    const idCagnotte = regexGroups[2];
    const foundCagnotte = await Cagnotte.getCagnotteById(idCagnotte);
    if (selectedAction === 'details') {
      const cagnotteTransactions = foundCagnotte.history;
      if (cagnotteTransactions.length >= 1) {
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-history-button-found', { cagnotteName: foundCagnotte.name });
        _.forEach(cagnotteTransactions, (t) => {
          const textTransaction = `*${t.reason}*, <@${t.author}> a ajouté *${t.amount}€*`;
          respMsg.attachments.push({
            color: '#40b17a',
            text: textTransaction,
          });
        });
        respond(respMsg);
      } else if (cagnotteTransactions.length === 0) {
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-history-button-not-found', { cagnotteName: foundCagnotte.name });
        respond(respMsg);
      }
    } else {
      const userID = payload.user.id;
      await Workflow.deleteExistingWFAuthor(userID);
      await AddCagnotteWF.addTo(userID, foundCagnotte.name);
      const respMsg = {
        text: `Quelle somme :euro: veux-tu ajouter à *${foundCagnotte.name}* ?`,
        replace_original: false,
      };
      respond(respMsg);
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.validateWFNewCagnotteAction = async (payload, respond) => {
  try {
    const testString = payload.callback_id;
    const userId = payload.user.id;
    const teamId = payload.team.id;
    const regexGroups = testString.match(/(cagnotte:)(\w*)(:validate_new)/);
    const idWFCagnotte = regexGroups[2];
    const foundWFCagnotte = await NewCagnotteWF.getCagnotteById(idWFCagnotte);
    const selectedAction = payload.actions[0].value;
    const slack = await SlackInstance.getClientByTeamId(teamId);
    if (foundWFCagnotte && selectedAction === 'validate') {
      await Workflow.deleteExistingWFAuthor(userId);
      const cartelCagnottes = await Cartel.getCagnottesByTeamId(teamId);
      const foundCagnotte = _.find(
        cartelCagnottes.ritual_instances,
        { name: foundWFCagnotte.name },
      );
      if (foundCagnotte) {
        let textMsg = `*Auteur*: <@${foundCagnotte.author}> \n*Titre*: ${foundCagnotte.name}`;
        if (foundCagnotte.amount) textMsg += `\n*Montant*: ${foundCagnotte.amount}`;
        const mapping = {
          cagnotteName: foundCagnotte.name,
          text: textMsg,
        };
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-disc-ko-message-validated', mapping);
        respond(respMsg);
      } else {
        try {
          const newCagnotte = await Cagnotte.createCagnotte(foundWFCagnotte.name,
            userId, teamId, foundWFCagnotte.description);
          cartelCagnottes.ritual_instances.push(newCagnotte.id);
          await cartelCagnottes.save();
          const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-disc-ok-message-validated', { userId });
          slack.chat.postMessage(
            {
              channel: 'general',
              text: `Hello l'équipe! <@${newCagnotte.author}> a créé la tirelire *${newCagnotte.name}* (_${newCagnotte.description}_)`,
            },
          );
          const cagnottesMsg = await this.onListCagnottesAction(payload.team.id);
          slack.chat.postMessage({
            channel: payload.channel.id,
            text: cagnottesMsg.text,
            attachments: cagnottesMsg.attachments,
            as_user: true,
          });
          respond(respMsg);
        } catch (err) {
          console.error(chalk.red('Error ✗'), err);
        }
      }
    } else if (foundWFCagnotte && selectedAction === 'cancel') {
      await Workflow.deleteExistingWFAuthor(userId);
      const mapping = {
        userId,
        cagnotteName: foundWFCagnotte.name,
      };
      const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-disc-ok-message-cancel', mapping);
      respond(respMsg);
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.createCagnotteWF = async (payload, respond) => {
  try {
    const userID = payload.user.id;
    await Workflow.deleteExistingWFAuthor(userID);
    await NewCagnotteWF.createCagnotte(userID);
    const respMsg = {
      replace_original: false,
      text: 'Comment la nommer?',
    };
    respond(respMsg);
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.addToCagnotteWF = async (
  slackClient, foundWorkFlow, typedText, channel, teamId, userId,
) => {
  try {
    let textMsg = typedText;
    const foundWF = foundWorkFlow;
    const slack = await SlackInstance.getClientByTeamId(teamId);

    if (!foundWF.amount) {
      const amountRgx = /\d{1,5}[.,,]?\d{0,2}[$,€]?/;
      const regexCheck = textMsg.match(amountRgx);
      if (regexCheck) {
        textMsg = textMsg.replace('€', '');
        textMsg = textMsg.replace('$', '');
        foundWF.amount = textMsg.replace(/,/g, '.');
        await foundWF.save();
        const mapping = {
          channel,
          amount: textMsg,
        };
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-disc-ok-amount', mapping);
        slackClient.chat
          .postMessage(respMsg)
          .catch(console.error);
      } else {
        const mapping = {
          channel,
          amount: textMsg,
        };
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-disc-ko-amount', mapping);
        slackClient.chat
          .postMessage(respMsg)
          .catch(console.error);
      }
    } else if (foundWF.amount && !foundWF.reason) {
      await Workflow.deleteExistingWFAuthor(userId);
      const cartelCagnottes = await Cartel.getCagnottesByTeamId(teamId);
      const foundCagnotte = _.find(
        cartelCagnottes.ritual_instances,
        { name: foundWF.cagnotteName },
      );
      if (foundCagnotte) {
        const newParticipation = {
          author: userId,
          amount: foundWF.amount,
          reason: textMsg,
        };
        if (_.isNil(foundCagnotte.amount)) {
          foundCagnotte.amount = foundWF.amount;
        } else {
          foundCagnotte.amount = +foundCagnotte.amount + +foundWF.amount;
        }
        foundCagnotte.history.push(newParticipation);
        await foundCagnotte.save();
        const mapping = {
          channel,
          amount: foundWF.amount,
          cagnotteName: foundWF.cagnotteName,
        };
        const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-disc-ok-reason', mapping);
        slack.chat.postMessage(
          {
            channel: 'general',
            text: `*${newParticipation.reason}*, <@${foundWF.author}> a ajouté *${foundWF.amount}€* à la tirelire *${foundWF.cagnotteName}*`,
          },
        );
        slackClient.chat
          .postMessage(respMsg)
          .catch(console.error);
      }
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.createCagnotteCommand = async (req, res) => {
  try {
    const { team_id, text, user_id } = req.body;
    const cartelCagnottes = await Cartel.getCagnottesByTeamId(team_id);
    /* const foundMember = await Cartel.findOne({
      members: { $elemMatch: { slack_uid: user_id } },
      slack_team_id: team_id,
    }); */
    const foundCagnottes = _.find(cartelCagnottes.ritual_instances, { name: text });
    if (!foundCagnottes) {
      const newCagnotte = await Cagnotte.createCagnotte(text, user_id, team_id);
      cartelCagnottes.ritual_instances.push(newCagnotte.id);
      await cartelCagnottes.save();
      const mapping = {
        userId: user_id,
        cagnotteName: text,
      };
      const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-command-ok', mapping);
      res.send(respMsg);
    } else {
      let textMsg = `*Auteur*: <@${user_id}> \n*Titre*: ${text}`;
      if (foundCagnottes.amount) textMsg += `\n*Montant*: ${foundCagnottes.amount}`;
      const mapping = {
        text: textMsg,
        cagnotteName: text,
      };
      const respMsg = await MsgService.getCagnotteMessage('cagnotte-new-command-ko-already-name', mapping);
      res.send(respMsg);
    }
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
};

exports.participateCagnotteCommand = async (req, res) => {
  try {
    const { team_id, text, user_id } = req.body;
    const addAmountRgx = /(\s*)((\d{1,5})([.|,]\d{0,2}){0,1})([$,€]?)( à )(.*) pour (.*)/;
    const regexGroups = text.match(addAmountRgx);
    if (regexGroups) {
      const integer = regexGroups[3];
      let decimal = regexGroups[4];
      let currency = regexGroups[5];
      const cagnotteWritten = regexGroups[7];
      const reason = regexGroups[8];
      let amount = integer;
      if (decimal) {
        decimal = decimal.replace(',', '.');
        amount = +integer + +Number(decimal);
      }
      const nameKeywords = _.split(cagnotteWritten, ' ', 4);
      const cartel = await Cartel.getCagnottesByTeamId(team_id);
      const cartelCagnottes = cartel.ritual_instances;
      if (cartelCagnottes) {
        const foundCagnottes = _.filter(cartelCagnottes, (c) => {
          const test = _.filter(nameKeywords, k => _.includes(c.name, k));
          if (test.length === nameKeywords.length) return c;
          return null;
        });
        if (foundCagnottes.length === 0) {
          const mapping = {
            cagnotteName: cagnotteWritten,
          };
          const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-command-ko-none-kw', mapping);
          res.send(respMsg);
        } else if (foundCagnottes.length > 1) {
          const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-command-ko-multiple-kw');
          _.forEach(foundCagnottes, (c) => {
            let textCagnotte = `*Auteur*: <@${c.author}> \n*Titre*: ${c.name}`;
            if (c.amount) textCagnotte += `\n*Montant*: ${c.amount}`;
            respMsg.attachments.push({
              color: '#F44336',
              text: textCagnotte,
            });
          });
          res.send(respMsg);
        } else {
          const newParticipation = {
            author: user_id,
            amount,
            reason,
          };
          const cagnotte = foundCagnottes[0];
          if (_.isNil(cagnotte.amount)) {
            cagnotte.amount = amount;
          } else {
            cagnotte.amount = +cagnotte.amount + +amount;
          }
          cagnotte.history.push(newParticipation);
          await cagnotte.save();
          if (currency === '') currency = '€';
          const mapping = {
            amount,
            currency,
            cagnotte,
            reason,
          };
          const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-command-ok', mapping);
          res.send(respMsg);
        }
      }
    } else {
      const respMsg = await MsgService.getCagnotteMessage('cagnotte-participate-command-ko-syntax');
      res.send(respMsg);
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.onListCagnottesAction = async (teamId) => {
  try {
    const cagnottesMsg = await MsgService.getCagnotteMessage('cagnotte-list-disc-healine');
    const createCagnotteMsg = await MsgService.getCagnotteMessage('cagnotte-list-disc-action-new');
    const cartelCagnottes = await Cartel.getCagnottesByTeamId(teamId);
    if (cartelCagnottes.ritual_instances) {
      const ritualInstances = cartelCagnottes.ritual_instances;
      const instancePromises = [];
      _.forEach(ritualInstances, (instance) => {
        const mapping = {
          cagnotteId: instance.id,
          cagnotteName: instance.name,
          cagnotteAuthor: instance.author,
          cagnotteDesc: instance.description,
        };
        instancePromises.push(MsgService.getCagnotteMessage('cagnotte-list-disc-action-cagnotte', mapping)
          .then((message) => {
            const mess = message;
            if (instance.amount) mess.text += `\n*Montant*: ${instance.amount}€`;
            return mess;
          }));
      });
      const cagnotteMessages = await Promise.all(instancePromises);
      cagnottesMsg.attachments = cagnotteMessages;
      cagnottesMsg.attachments.push(createCagnotteMsg);
    }
    return cagnottesMsg;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
