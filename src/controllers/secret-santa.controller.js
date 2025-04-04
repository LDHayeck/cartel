/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
const _ = require('lodash');
const chalk = require('chalk');
const dateFnc = require('date-fns');
const dateFr = require('date-fns/locale/fr');
const SecretSanta = require('../db/models/secret-santa');
const Cartel = require('../db/models/cartel');
const MsgService = require('../utils/messages/messages-service');
const SlackInstance = require('../utils/slack-instance');

const SECRET_SANTA_BASE_URL = 'https://s3.eu-west-3.amazonaws.com/cartel-admin/secret-santa-images/';

function parseDateText(text) {
  // eslint-disable-next-line no-useless-escape
  const dateRegex = /((.*) à)?((\d{1,2})[\/,-x](\d{1,2})[\/,-]?(\d{0,4})){0,1}/;
  const regexGroups = text.match(dateRegex);
  const textValues = {};
  if (regexGroups) {
    const secretSantaDay = regexGroups[4];
    const secretSantaMonth = regexGroups[5];
    let secretSantaYear = regexGroups[6];

    textValues.day = parseInt(secretSantaDay, 10);
    textValues.month = parseInt(secretSantaMonth, 10); // - 1

    if (secretSantaYear === '18') {
      secretSantaYear = '2018';
    }
    if (secretSantaYear === '19') {
      secretSantaYear = '2019';
    }
    if (secretSantaYear !== '') {
      textValues.year = parseInt(secretSantaYear, 10);
    }
    return textValues;
  }
  return null;
}

function getSecretSantaDate(day, month, year) {
  let checkedYear = year;
  const checkedMonth = month;
  const checkedDay = day;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  if (Number.isNaN(checkedDay) || Number.isNaN(checkedMonth)) {
    return 'Veuillez rentrer une date valide';
  }
  if (Number.isNaN(checkedYear) || !checkedYear) checkedYear = currentYear;

  const lastMonthDay = new Date(checkedYear, month, 0).getDate();

  if (year < currentYear || year > currentYear + 10) {
    return `L'année du Secret Santa doit être comprise entre ${currentYear} et ${currentYear + 1}`;
  }
  if (day < 1 || day > lastMonthDay) {
    return `Le jour du Secret Santa doit être compris entre le 1 et ${lastMonthDay}`;
  }

  const newDateString = `${checkedYear}-${checkedMonth}-${checkedDay}`;
  const newDate = dateFnc.parse(newDateString, 'yyyy-MM-dd');

  if (dateFnc.isBefore(newDate, new Date())) {
    return 'La date choisie ne peut être dans le passé';
  }
  return newDate;
}

exports.openSecretSantaDialog = async (payload) => {
  const slack = await SlackInstance.getClientByTeamId(payload.team.id);
  const dialogMsg = await MsgService.getSecretSantaMessage('secret-santa-new-dialog-open', { triggerId: payload.trigger_id });
  slack.dialog.open(dialogMsg);
};

exports.createSecretSanta = async (payload, respond) => {
  // USER INFO
  const teamId = payload.team.id;
  const userId = payload.user.id;
  // DiALOG SUBMISSION INFO
  const channelTarget = payload.submission.channel;
  const budgetMax = payload.submission.budget;
  const dateString = payload.submission.date;
  const message = payload.submission.message;
  // GET CARTEL
  const slack = await SlackInstance.getClientByTeamId(teamId);
  const cartelSecretSanta = await Cartel.getSecretSantaByTeamId(teamId);
  // CHECK IF SECRET SANTA EXISTS FOR SPECIFIC CHANNEL IN CARTEL
  const foundSecretSanta = _.find(cartelSecretSanta.ritual_instances, { slack_team_id: teamId, channelTarget });
  if (foundSecretSanta) {
    const santaExistsMessage = await MsgService.getSecretSantaMessage('secret-santa-exists-ko');
    respond(santaExistsMessage);
    return;
  }

  // CONVERT DATE_STRING INTO DATE
  const dateValues = parseDateText(dateString);
  const dateStatement = getSecretSantaDate(dateValues.day, dateValues.month, dateValues.year);

  if (dateStatement instanceof Date) {
    const newSecretSanta = await SecretSanta.createSecretSanta(userId, teamId, budgetMax, dateStatement, message, channelTarget);
    cartelSecretSanta.ritual_instances.push(newSecretSanta.id);
    await cartelSecretSanta.save();
    const map = {
      SecretSantaId: newSecretSanta.id,
      userId,
      channel: channelTarget,
      budget: budgetMax,
      base_url: SECRET_SANTA_BASE_URL,
      messageString: message,
    };
    const rspMsg = await MsgService.getSecretSantaMessage('secret-santa-create-ok', map);
    const adminResponse = await MsgService.getSecretSantaMessage('secretSanta-admin-onCreate-msg', { channel: payload.channel.id, SecretSantaId: newSecretSanta.id });
    slack.chat.postMessage(rspMsg);
    slack.chat.postMessage(adminResponse);
  } else {
    const mapping = {
      dateStatement,
      channel: payload.channel.id,
    };
    const santaDateMessage = await MsgService.getSecretSantaMessage('secret-santa-date-ko', mapping);
    respond(santaDateMessage);
  }
};

exports.selectSecretSantaAction = async (payload, respond) => {
  try {
    const testString = payload.callback_id;
    const originalMessage = payload.original_message;
    const userId = payload.user.id;
    const userName = payload.user.name;
    const selectedAction = payload.actions[0].value;
    const regexGroups = testString.match(/(secretSanta:)(\w*)(:participate)/);
    const secretSantaId = regexGroups[2];
    const foundSecretSanta = await SecretSanta.getSecretSantaById(secretSantaId);
    if (selectedAction === 'participate' && !foundSecretSanta.inscriptionStop) {
      const foundParticipant = _.find(foundSecretSanta.participants, { slack_uid: userId });
      if (!foundParticipant) {
        const rdm = (Math.floor(Math.random() * 1000) + 1).toFixed(2);
        const newParticipant = {
          slack_uid: userId,
          slack_name: userName,
          didCheckSecretSanta: false,
          reciever_id: null,
          reciever_name: null,
          gift_wish: null,
          randomClassifier: rdm,
        };

        foundSecretSanta.participants.push(newParticipant);
        const addParticipant = await foundSecretSanta.save();
        if (addParticipant) {
          const respMsg = await MsgService.getSecretSantaMessage('secretSanta-participate-disc-ok', { userId });
          respond(respMsg);
          if (originalMessage.attachments.length === 1) {
            originalMessage.attachments.unshift({
              color: '#4D82F2',
              text: `Participants: <@${userId}>`,
            });
          } else {
            originalMessage.attachments[0].text += ` <@${userId}>`;
          }
          return originalMessage;
        }
      } else {
        respond({ replace_original: false, text: 'Non non tu participe deja' });
      }
    } else {
      respond({ replace_original: false, text: 'Désolé les inscriptions sont cloturées' });
    }
    return originalMessage;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
  // S'il participe c'est bon
};

exports.adminSecretSantaAction = async (payload) => {
  try {
    const testString = payload.callback_id;
    const selectedAction = payload.actions[0].value;
    const teamId = payload.team.id;
    const regexGroups = testString.match(/(secretSanta:)(\w*)(:action)/);
    const idSecretSanta = regexGroups[2];
    const slack = await SlackInstance.getClientByTeamId(teamId);
    const foundSecretSanta = await SecretSanta.getSecretSantaById(idSecretSanta);

    if (selectedAction === 'remind_santa') {
      if (foundSecretSanta) {
        const map = {
          SecretSantaId: foundSecretSanta.id,
          base_url: SECRET_SANTA_BASE_URL,
          channel: foundSecretSanta.channelTarget,
        };
        const rspMsg = await MsgService.getSecretSantaMessage('secret-santa-remind-ok', map);
        _.forEach(foundSecretSanta.participants, (p) => {
          if (rspMsg.attachments.length === 1) {
            rspMsg.attachments.unshift({
              color: '#4D82F2',
              text: `Participants: <@${p.slack_uid}>`,
            });
          } else {
            rspMsg.attachments[0].text += ` <@${p.slack_uid}>`;
          }
        });
        slack.chat.postMessage(rspMsg);
      }
    }

    if (selectedAction === 'close_insc') {
      if (foundSecretSanta) {
        if (!foundSecretSanta.inscriptionStop) {
          foundSecretSanta.participants.sort((a, b) => a.randomClassifier - b.randomClassifier);
          for (let i = 1; i < foundSecretSanta.participants.length; i += 1) {
            foundSecretSanta.participants[i - 1].reciever_name = foundSecretSanta.participants[i].slack_name;
            foundSecretSanta.participants[i - 1].reciever_id = foundSecretSanta.participants[i].slack_uid;
          }
          foundSecretSanta.participants[foundSecretSanta.participants.length - 1].reciever_id = foundSecretSanta.participants[0].slack_uid;
          foundSecretSanta.participants[foundSecretSanta.participants.length - 1].reciever_name = foundSecretSanta.participants[0].slack_name;
          foundSecretSanta.inscriptionStop = true;
          await foundSecretSanta.save();

          const timeDeadline = dateFnc.format(
            foundSecretSanta.eventDate,
            'dddd DD MMMM YYYY',
            { locale: dateFr },
          );

          let textParticipants = 'La liste des participants: ';
          _.forEach(foundSecretSanta.participants, (p) => {
            textParticipants += `<@${p.slack_uid}> `;
          });
          const textDate = `La remise des cadeaux est prévue pour le \`${timeDeadline}\``;
          const channelInfo = await slack.channels.info({ channel: foundSecretSanta.channelTarget });

          const admin_map = {
            channelTarget: foundSecretSanta.author,
            channelTargetName: channelInfo.channel.name,
            santaId: foundSecretSanta.id,
            text1: textParticipants,
            text2: textDate,
            date: timeDeadline,
            budget: foundSecretSanta.maxBudget,
          };

          const adminMessage = await MsgService.getSecretSantaMessage('secret-santa-close-admin-message', admin_map);
          const channelMessage = await MsgService.getSecretSantaMessage('secret-santa-close-channel-message', { channelTarget: foundSecretSanta.channelTarget }); // foundSecretSanta.channelTarget

          slack.chat.postMessage(adminMessage);
          slack.chat.postMessage(channelMessage);

          for (const participant of foundSecretSanta.participants) {
            if (participant.slack_uid !== foundSecretSanta.author) {
              const user_map = {
                channelTarget: participant.slack_uid,
                santaId: foundSecretSanta.id,
                userId: participant.slack_uid,
                date: timeDeadline,
                budget: foundSecretSanta.maxBudget,
              };
              // eslint-disable-next-line no-await-in-loop
              const userMessage = await MsgService.getSecretSantaMessage('secret-santa-close-user-message', user_map);
              slack.chat.postMessage(userMessage);
            }
          }
        }
      }
    }

    if (selectedAction === 'delete') {
      const cartelSecretSanta = await Cartel.getCartelWithRitualsByTeamId(teamId);
      const SecretSantaIndex = _.findIndex(cartelSecretSanta.ritual_instances, { id: idSecretSanta });
      await SecretSanta.findByIdAndRemove(foundSecretSanta.id);
      cartelSecretSanta.ritual_instances.splice(SecretSantaIndex, 1);
      await cartelSecretSanta.save();
      const channelInfo = await slack.channels.info({ channel: foundSecretSanta.channelTarget });
      // Send a message to each participant in case of event deletion.
      _.forEach(foundSecretSanta.participants, (p) => {
        slack.chat.postMessage(
          {
            channel: p.slack_uid,
            text: `Hello l'équipe! <@${foundSecretSanta.author}> a supprimé le Secret Santa pour le channel *${channelInfo.channel.name}* :disappointed:`,
            as_user: true,
          },
        );
      });
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

exports.afterSignUpCloseAction = async (payload, respond) => {
  const testString = payload.callback_id;
  const userId = payload.user.id;
  const selectedAction = payload.actions[0].value;
  const regexGroups = testString.match(/(secretSanta:)(\w*)(:closed)/);
  const secretSantaId = regexGroups[2];
  const foundSecretSanta = await SecretSanta.getSecretSantaById(secretSantaId);

  if (foundSecretSanta) {
    if (selectedAction === 'match_result') {
      try {
        const participant = _.find(foundSecretSanta.participants, { slack_uid: userId });
        if (participant) {
          participant.didCheckSecretSanta = true;
          await foundSecretSanta.save();
          const map = {
            userId,
            reciever: participant.reciever_id,
            base_url: SECRET_SANTA_BASE_URL,
          };
          const respMsg = await MsgService.getSecretSantaMessage('secret-santa-match-result-message', map);
          respond(respMsg);
        }
      } catch (err) {
        console.error(chalk.red('Error ✗'), err);
        return err;
      }
    }
  }
};

exports.onListSecretSantaAction = async (teamId, userId) => {
  const respMsg = await MsgService.getSecretSantaMessage('secretSanta-list-action');
  const createButton = await MsgService.getSecretSantaMessage('secret-Santa-create-button');
  const slack = await SlackInstance.getClientByTeamId(teamId);
  const channelList = await slack.channels.list();
  try {
    const cartelSecretSantas = await Cartel.getSecretSantaByTeamId(teamId);
    if (cartelSecretSantas.ritual_instances) {
      const ritualInstances = cartelSecretSantas.ritual_instances;
      const authorPromises = [];
      const userPromises = [];
      const closedUserPromises = [];
      const closedAdminPromises = [];
      const userParticipatedPromises = [];
      _.forEach(ritualInstances, (instance) => {
        const targetChannel = _.filter(channelList.channels, c => c.id === instance.channelTarget);
        const memberArray = targetChannel[0].members;
        const targetChannelName = targetChannel[0].name;
        let isMember = false;
        const foundParticipant = _.find(instance.participants, { slack_uid: userId });
        _.forEach(memberArray, (member) => {
          if (userId === member) isMember = true;
        });
        if (isMember) {
          const count = instance.participants.length;
          if (instance.inscriptionStop) {
            if (foundParticipant) {
              const timeDeadline = dateFnc.format(
                instance.eventDate,
                'dddd DD MMMM YYYY',
                { locale: dateFr },
              );
              if (userId === instance.author) {
                let textParticipants = 'La liste des participants: ';
                _.forEach(instance.participants, (p) => {
                  textParticipants += `<@${p.slack_uid}> `;
                });

                const textDate = `La remise des cadeaux est prévue pour le \`${timeDeadline}\``;
                const admin_map = {
                  santaId: instance.id,
                  channelTargetName: targetChannelName,
                  text1: textParticipants,
                  text2: textDate,
                };
                closedAdminPromises.push(MsgService.getSecretSantaMessage('secret-santa-list-close-admin-message', admin_map));
              } else {
                const user_map = {
                  santaId: instance.id,
                  userId: instance.slack_uid,
                  base_url: SECRET_SANTA_BASE_URL,
                  channelTargetName: targetChannelName,
                  date: timeDeadline,
                  budget: instance.maxBudget,
                };
                // eslint-disable-next-line no-await-in-loop
                closedUserPromises.push(MsgService.getSecretSantaMessage('secret-santa-list-close-user-message', user_map));
              }
            }
          } else if (!instance.inscriptionStop) {
            if (userId === instance.author) {
              const mapping = {
                SecretSantaId: instance.id,
                userId,
                channel: instance.channelTarget,
                channelTarget: targetChannelName,
                messageString: instance.message,
                participantCount: count,
              };
              authorPromises.push(MsgService.getSecretSantaMessage('secretSanta-admin-msg', mapping)
                .then((message) => {
                  const mess = message;
                  _.forEach(instance.participants, (p) => {
                    mess.text += `<@${p.slack_uid}> `;
                  });
                  return mess;
                }));
            } else if (foundParticipant) {
              const user_p_map = {
                channelName: targetChannelName,
                userId,
                authorId: instance.author,
              };
              userParticipatedPromises.push(MsgService.getSecretSantaMessage('secret-santa-list-did-participate-user-message', user_p_map));
            } else {
              const mapping = {
                channelTarget: targetChannelName,
                SecretSantaId: instance.id,
                userId,
                budget: instance.maxBudget,
                authorId: instance.author,
                participantCount: count,
              };
              userPromises.push(MsgService.getSecretSantaMessage('secretSanta-user-msg', mapping)
                .then((message) => {
                  const mess = message;
                  _.forEach(instance.participants, (p) => {
                    mess.text += `<@${p.slack_uid}> `;
                  });
                  return mess;
                }));
            }
          }
        }
      });
      const closedUserMsg = await Promise.all(closedUserPromises);
      const closedAdminMsg = await Promise.all(closedAdminPromises);
      const adminMsg = await Promise.all(authorPromises);
      const userMsg = await Promise.all(userPromises);
      const userParticipatedMsg = await Promise.all(userParticipatedPromises);
      const message = adminMsg.concat(userMsg);
      const fullMessage = closedAdminMsg.concat(closedUserMsg).concat(message).concat(userParticipatedMsg);
      respMsg.attachments = fullMessage;
      respMsg.attachments.push(createButton);
      return respMsg;
    }

    return { text: 'hello my friend YOU ARE THE AUTHOR' };
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
