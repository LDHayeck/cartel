/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
const _ = require('lodash');
const chalk = require('chalk');
const dateFnc = require('date-fns');
const dateFr = require('date-fns/locale/fr');
const Cartel = require('../db/models/cartel');
const TrainEvent = require('../db/models/train-event');
const SlackInstance = require('../utils/slack-instance');
const MsgService = require('../utils/messages/messages-service');

// UTILITY FUNCTIONS
function getEventDate(hour, min, day, month, year) {
  let checkedYear = year;
  let checkedMonth = month;
  let checkedDay = day;
  let checkedMin = min;
  let checkedHour = hour;

  if (month && (month < 1 || month > 12)) {
    return 'Le mois de l\'évènement doit être compris entre 1 et 12';
  }
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  if (Number.isNaN(checkedDay)) checkedDay = currentDate.getDate();
  if (Number.isNaN(checkedMonth)) checkedMonth = dateFnc.getMonth(currentDate) + 1;
  if (Number.isNaN(checkedYear) || !checkedYear) checkedYear = currentYear;
  if (Number.isNaN(checkedMin) || !checkedMin) checkedMin = 0;
  if (Number.isNaN(checkedHour) || !checkedHour) checkedHour = 0;

  const lastMonthDay = new Date(checkedYear, month, 0).getDate();
  if (year < currentYear || year > currentYear + 10) {
    return `L'année de l'évènement doit être comprise entre ${currentYear} et ${currentYear + 1}`;
  }
  if (day < 1 || day > lastMonthDay) {
    return `Le jour de l'évènement doit être compris entre le 1 et ${lastMonthDay}`;
  }
  if (hour < 0 || hour > 23) {
    return 'L\'heure de l\'évènement doit être compris entre le 0 et 23';
  }
  if (min < 0 || min > 59) {
    return 'L\'heure de l\'évènement doit être compris entre le 0 et 59';
  }
  let newDateString;
  if (checkedHour < 10) {
    if (checkedMin > 0 && checkedMin < 10) {
      newDateString = `${checkedYear}-${checkedMonth}-${checkedDay} 0${checkedHour}:0${checkedMin}`;
    } else if (checkedMin === 0) {
      newDateString = `${checkedYear}-${checkedMonth}-${checkedDay} 0${checkedHour}:${checkedMin}0`;
    } else {
      newDateString = `${checkedYear}-${checkedMonth}-${checkedDay} 0${checkedHour}:${checkedMin}`;
    }
  } else if (checkedMin > 0 && checkedMin < 10) {
    newDateString = `${checkedYear}-${checkedMonth}-${checkedDay} ${checkedHour}:0${checkedMin}`;
  } else if (checkedMin === 0) {
    newDateString = `${checkedYear}-${checkedMonth}-${checkedDay} ${checkedHour}:${checkedMin}0`;
  } else {
    newDateString = `${checkedYear}-${checkedMonth}-${checkedDay} ${checkedHour}:${checkedMin}`;
  }
  const newDate = dateFnc.parse(newDateString, 'yyyy-MM-dd HH:mm');
  if (dateFnc.isBefore(newDate, new Date())) {
    return 'La date choisie ne peut être dans le passé';
  }
  return newDate;
}

function parseTrainText(text) {
  // eslint-disable-next-line no-useless-escape
  const newTrainRgx = /((.*) à )?(\d{1,2})[h,:,-](\d{0,2})( le (\d{1,2})[\/,-](\d{1,2})[\/,-]?(\d{0,4})){0,1}/;
  const regexGroups = text.match(newTrainRgx);
  const textValues = {};
  if (regexGroups) {
    const trainReason = regexGroups[2];
    const trainHour = regexGroups[3];
    const trainMinutes = regexGroups[4];
    const trainDay = regexGroups[6];
    const trainMonth = regexGroups[7];
    let trainYear = regexGroups[8];
    textValues.reason = trainReason;
    textValues.day = parseInt(trainDay, 10);
    textValues.month = parseInt(trainMonth, 10); // - 1
    textValues.hour = parseInt(trainHour, 10);
    textValues.min = parseInt(trainMinutes, 10);
    if (trainYear === '18') {
      trainYear = '2018';
    }
    if (trainYear === '19') {
      trainYear = '2019';
    }
    if (trainYear !== '') {
      textValues.year = parseInt(trainYear, 10);
    }
    return textValues;
  }
  return null;
}

// CREATE TRAIN WITH SLACK COMMAND
exports.createTrainCommand = async (req, res) => {
  try {
    const {
      team_id,
      text,
      user_id,
      channel_id,
    } = req.body;
    const slack = await SlackInstance.getClientByTeamId(team_id);
    if (!slack) {
      return console.error('No authorization found for this team. Did you install this app again after restarting?');
    }
    const cartelTrains = await Cartel.getTrainEventByTeamId(team_id);
    /* const foundMember = await Cartel.findOne({
      members: { $elemMatch: { slack_uid: user_id } },
      slack_team_id: team_id,
    }); */
    const typedTextObj = parseTrainText(text);
    if (typedTextObj && typedTextObj.reason) {
      const foundTrains = _.find(cartelTrains.ritual_instances, { name: typedTextObj.reason });
      if (!foundTrains) {
        const dateStatement = getEventDate(
          typedTextObj.hour,
          typedTextObj.min,
          typedTextObj.day,
          typedTextObj.month,
          typedTextObj.year,
        );
        if (dateStatement instanceof Date) {
          const newTrain = await TrainEvent.createTrainEvent(
            typedTextObj.reason,
            user_id,
            team_id,
            dateStatement,
            channel_id,
          );
          cartelTrains.ritual_instances.push(newTrain.id);
          await cartelTrains.save();
          const dateFormat = dateFnc.format(dateStatement, '[à] HH:mm [le] dddd DD MMMM YYYY', { locale: dateFr });
          const mapping = {
            channel: channel_id,
            userId: user_id,
            trainId: newTrain.id,
            reason: typedTextObj.reason,
            dateFormat,
          };
          const respMsg = await MsgService.getTrainMessage('train-new-command-ok', mapping);
          return slack.chat.postMessage(respMsg);
        }
        const respMsg = await MsgService.getTrainMessage('train-new-command-ko-date', { dateStatement });
        return res.send(respMsg);
      }
      let textMsg = `*Auteur*: <@${user_id}> *Titre*: ${foundTrains.name}`;
      if (foundTrains.amount) textMsg += `\n*Montant*: ${foundTrains.amount}`;
      const mapping = {
        trainName: typedTextObj.reason,
        text: textMsg,
      };
      const respMsg = await MsgService.getTrainMessage('train-new-command-ko-name-exists', mapping);
      return res.send(respMsg);
    }
    const respMsg = await MsgService.getTrainMessage('train-new-command-ko-syntax');
    return res.send(respMsg);
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
    return err;
  }
};

// LIST EVENTS
exports.onListTrainsAction = async (teamId, userId) => {
  const trainMsg = await MsgService.getTrainMessage('train-list-disc-headline');
  const createTrainMsg = await MsgService.getTrainMessage('train-list-disc-action-new');
  const participateButton = await MsgService.getTrainMessage('train-list-disc-action-participate');
  const deleteButton = await MsgService.getTrainMessage('train-list-disc-action-delete');
  const rappelButton = await MsgService.getTrainMessage('train-list-disc-action-remind');
  try {
    const cartelTrains = await Cartel.getTrainEventByTeamId(teamId);
    if (cartelTrains.ritual_instances) {
      const ritualInstances = cartelTrains.ritual_instances;
      const trainPromises = [];
      _.forEach(ritualInstances, (instance) => {
        let dateTxt = '';
        if (dateFnc.isToday(instance.deadline)) { dateTxt = '`aujourd\'hui`, '; }
        if (dateFnc.isTomorrow(instance.deadline)) { dateTxt = '`demain`, '; }
        if (dateFnc.differenceInCalendarDays(instance.deadline, new Date()) === 2) { dateTxt = '`après demain`, '; }

        const dateFormat = dateFnc.format(instance.deadline, '[le] dddd DD MMMM YYYY [à] HH:mm', { locale: dateFr });
        const mapping = {
          trainId: instance.id,
          trainName: instance.name,
          trainAuthor: instance.author,
          dateTxt,
          dateFormat,
        };
        trainPromises.push(MsgService.getTrainMessage('train-list-disc-action-train', mapping)
          .then((message) => {
            const mess = message;
            _.forEach(instance.participants, (p) => {
              mess.text += `<@${p}> `;
            });
            mess.text += 'y participe(nt)';
            mess.actions.push(participateButton);
            if (instance.author === userId) {
              mess.actions.push(rappelButton);
              mess.actions.push(deleteButton);
            }
            return mess;
          }));
      });
      const trainMessages = await Promise.all(trainPromises);
      trainMsg.attachments = trainMessages;
    }
    trainMsg.attachments.push(createTrainMsg);
    return trainMsg;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};

// PARTICIPATE TO EVENTS AND DELETE EVENTS
exports.selectTrainAction = async (payload, respond) => {
  try {
    const testString = payload.callback_id;
    const originalMessage = payload.original_message;
    const selectedAction = payload.actions[0].value;
    const userId = payload.user.id;
    const teamId = payload.team.id;
    const regexGroups = testString.match(/(train_event:)(\w*)(:select)/);
    const idTrain = regexGroups[2];
    const foundTrain = await TrainEvent.getTrainEventById(idTrain);
    const slack = await SlackInstance.getClientByTeamId(teamId);
    const mapping = {
      userId,
      trainName: foundTrain.name,
    };
    if (selectedAction === 'participate') {
      if (foundTrain.participants.indexOf(userId) === -1) {
        foundTrain.participants.push(userId);
        const addParticipant = await foundTrain.save();
        if (addParticipant) {
          const respMsg = await MsgService.getTrainMessage('train-participate-disc-ok', mapping);
          respond(respMsg);
          if (originalMessage.attachments.length === 1) {
            originalMessage.attachments.unshift({
              text: `Participants: <@${userId}>`,
            });
          } else {
            originalMessage.attachments[0].text += ` <@${userId}>`;
          }
          return originalMessage;
        }
        const respMsg = await MsgService.getTrainMessage('train-participate-disc-ko', mapping);
        respond(respMsg);
        return originalMessage;
      }
      const respMsg = await MsgService.getTrainMessage('train-participate-disc-ko-already-participate', mapping);
      respond(respMsg);
      return originalMessage;
    }

    if (selectedAction === 'remind') {
      if (foundTrain) {
        let dateString = '';
        const now = new Date();
        if (dateFnc.isToday(foundTrain.deadline)) dateString = '`aujourd\'hui`, ';
        if (dateFnc.isTomorrow(foundTrain.deadline)) dateString = '`demain`, ';
        if (dateFnc.differenceInCalendarDays(foundTrain.deadline, now) === 2) dateString = '`après demain`, ';

        const timeDeadline = dateFnc.format(
          foundTrain.deadline,
          'HH:mm [le] dddd DD MMMM YYYY',
          { locale: dateFr },
        );

        const map = {
          channel: foundTrain.channelTarget,
          trainAuthor: userId,
          trainId: foundTrain.id,
          trainName: foundTrain.name,
          dateTxt: dateString,
          timeDeadline,
        };

        const respMsg = await MsgService.getTrainMessage('train-remind-command-ok', map);
        _.forEach(foundTrain.participants, (p) => {
          if (respMsg.attachments.length === 1) {
            respMsg.attachments.unshift({
              color: '#40b17a',
              text: `Participants: <@${p}>`,
            });
          } else {
            respMsg.attachments[0].text += ` <@${p}>`;
          }
        });
        slack.chat.postMessage(respMsg);

        respond({
          replace_original: false,
          text: 'Ta relance a bien été envoyée',
        });
      } else {
        respond({
          replace_original: false,
          text: 'L\'Event en question n\'a pas été trouvé!',
        });
      }
      return originalMessage;
    }
    const cartelTrains = await Cartel.getCartelWithRitualsByTeamId(teamId);
    const trainIndex = _.findIndex(cartelTrains.ritual_instances, { id: idTrain });
    await TrainEvent.findByIdAndRemove(foundTrain.id);
    cartelTrains.ritual_instances.splice(trainIndex, 1);
    await cartelTrains.save();

    // Send a message to each participant in case of event deletion.
    _.forEach(foundTrain.participants, (p) => {
      slack.chat.postMessage(
        {
          channel: p,
          text: `Hello l'équipe! <@${foundTrain.author}> a supprimé l'event *${foundTrain.name}* :disappointed:`,
          as_user: true,
        },
      );
    });

    const respMsg = await MsgService.getTrainMessage('train-delete-disc-ok');
    respond(respMsg);
    return originalMessage;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};


// EVENT CREATE WITH DIALOG
exports.openCreateTrainDialog = async (payload) => {
  try {
    const slack = await SlackInstance.getClientByTeamId(payload.team.id);
    const today = new Date();
    const dateFormat = dateFnc.format(today, 'DD/MM/YYYY', { locale: dateFr });
    const map = {
      triggerId: payload.trigger_id,
      today: dateFormat,
    };
    const dialogMsg = await MsgService.getTrainMessage('train-new-dialog-open', map);
    slack.dialog.open(dialogMsg);
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

// eslint-disable-next-line consistent-return
exports.submittEventDialog = async (payload, respond) => { // RESULTAT DU DIALOG
  try {
    const userId = payload.user.id;
    const channel = payload.submission.channel;
    const date = payload.submission.date;
    const hour = payload.submission.heure;
    const trainName = payload.submission.name;
    const teamId = payload.team.id;
    let eventDateText;

    if (date) {
      eventDateText = `${hour} le ${date}`;
    } else {
      eventDateText = `${hour}`;
    }

    const slack = await SlackInstance.getClientByTeamId(teamId);
    const cartelTrains = await Cartel.getTrainEventByTeamId(teamId);

    const foundTrain = _.find(cartelTrains.ritual_instances, { name: trainName });

    if (foundTrain) {
      const mapping = {
        channel,
        trainName,
      };
      const respMsg = await MsgService.getTrainMessage('train-new-disc-ko-name-exists', mapping);
      slack.chat
        .postMessage(respMsg)
        .catch(console.error);
      respond(respMsg);
    } else {
      const typedTextObj = parseTrainText(eventDateText);
      if (!typedTextObj) {
        const notADate = 'Oups, Veuillez rentrer une heure valable';
        const mapping = {
          channel,
          dateStatement: notADate,
        };
        const respMsg = await MsgService.getTrainMessage('train-new-disc-ko-date', mapping);
        respond(respMsg);
        return;
      }
      const dateStatement = getEventDate(
        typedTextObj.hour,
        typedTextObj.min,
        typedTextObj.day,
        typedTextObj.month,
        typedTextObj.year,
      );
      if (dateStatement instanceof Date) {
        const newTrain = await TrainEvent.createTrainEvent(trainName, userId, teamId, dateStatement, channel);
        cartelTrains.ritual_instances.push(newTrain.id);
        await cartelTrains.save();
        const dateFormat = dateFnc.format(newTrain.deadline, '[à] HH:mm [le] dddd DD MMMM YYYY', { locale: dateFr });
        const mapping = {
          channel,
          trainAuthor: userId,
          trainName,
          dateFormat,
          trainId: newTrain.id,
        };
        try {
          const respMsg = await MsgService.getTrainMessage('train-new-disc-publish-channel', mapping);
          const trainPublished = await MsgService.getTrainMessage('train-new-disc-published', { channel });
          slack.chat.postMessage(respMsg);
          const trainMsg = await this.onListTrainsAction(payload.team.id, payload.user.id);
          slack.chat.postMessage({
            channel: payload.channel.id,
            text: trainMsg.text,
            attachments: trainMsg.attachments,
            as_user: true,
          });
          respond(trainPublished);
        } catch (err) {
          console.error(chalk.red('Error ✗'), err);
        }
      } else {
        const mapping = {
          channel,
          dateStatement,
        };
        const respMsg = await MsgService.getTrainMessage('train-new-disc-ko-date', mapping);
        respond(respMsg);
      }
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};
