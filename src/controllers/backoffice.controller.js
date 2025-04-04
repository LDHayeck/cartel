const _ = require('lodash');
const chalk = require('chalk');
const dateFnc = require('date-fns');
const Cartel = require('../db/models/cartel');
const MonthService = require('../utils/month-service');
const Workflow = require('../db/models/worflow/workflow-instance');
const BOBirthdayWF = require('../db/models/worflow/backoffice/birthday');
const SlackInstance = require('../utils/slack-instance');

exports.getCartelMembers = async (req, res) => {
  try {
    // const { teamId } = req.user;
    const { teamId } = req.params;
    const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
    res.setHeader('Content-Type', 'application/json');
    const data = {
      members: currentCartel.members,
    };
    res.send(JSON.stringify({
      status: 'success',
      data,
    }));
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
};

exports.getCartels = async (req, res) => {
  try {
    // const { teamId } = req.user;
    const cartels = await Cartel.find({});
    res.setHeader('Content-Type', 'application/json');
    const data = {
      cartels,
    };
    res.send(JSON.stringify({
      status: 'success',
      data,
    }));
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
}

exports.editMemberInfoFromCartelById = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { member } = req.body;
    const cartel = await Cartel.getCartelMemberByTeamId(teamId);
    const editedMember = _.find(cartel.members, { slack_uid: member.slack_uid });
    editedMember.birthdate = member.birthdate;
    await cartel.save();
    res.send(JSON.stringify({
      status: 'success',
      edit: 'TEST_OK',
    }));
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
};

exports.sendBirthdayFormReminder = async (req, res) => {
  try {
    const { teamId } = req.params;
    const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
    const slack = await SlackInstance.getClientByTeamId(teamId);
    const dayNumbers = _.range(1, 32);
    const daySelectValues = dayNumbers.map(y => ({
      text: y,
      value: y,
    }));
    const monthNumbers = _.range(1, 13);
    const monthSelectValues = monthNumbers.map(y => ({
      text: MonthService.monthNumToName(y),
      value: y,
    }));
    const yearNumbers = _.range(
      dateFnc.getYear(new Date()) - 70, dateFnc.getYear(new Date()) - 18,
    ).reverse();
    const yearsSelectValues = yearNumbers.map(y => ({
      text: y,
      value: y,
    }));
    _.forEach(currentCartel.members, (member) => {
      if (!member.birthdate) {
        slack.chat
          .postMessage({
            channel: member.slack_uid,
            as_user: true,
            text: `Hello <@${member.slack_uid}>, Cartel a été ajouté à ton workspace !`,
            response_type: 'in_channel',
            attachments: [
              {
                text: "*Cartel* est une application Slack permettant de pimenter la vie du bureau ! On vous facilite la tâche pour l'organisation d'événements, de tirelires en tout genre, on vous rappelle l'anniversaire de vos collègues, etc...",
                color: '#3AA3E3',
              },
              {
                text: 'Renseigne ton anniversaire pour que tes collègues puissent te laisser un petit mot le jour J :',
                fallback: "If you could read this message, you'd be choosing something fun to do right now.",
                color: '#3AA3E3',
                attachment_type: 'default',
                callback_id: 'birth_date_selection',
                actions: [
                  {
                    name: 'day',
                    text: 'Jour',
                    type: 'select',
                    options: daySelectValues,
                  },
                  {
                    name: 'month',
                    text: 'Mois',
                    type: 'select',
                    options: monthSelectValues,
                  },
                ],
              },
              {
                text: 'On a besoin de ton année pour compter le nombre de bougies sur ton gâteau ! (certains restant éternellement jeunes, l\'année est facultative) :',
                fallback: "If you could read this message, you'd be choosing something fun to do right now.",
                color: '#3AA3E3',
                attachment_type: 'default',
                callback_id: 'birth_date_selection',
                actions: [
                  {
                    name: 'year',
                    text: 'Année',
                    type: 'select',
                    options: yearsSelectValues,
                  },
                ],
              },
              {
                text: '',
                fallback: 'You are unable to validate your birthdate',
                callback_id: 'bo_birthdate',
                color: '#3AA3E3',
                attachment_type: 'default',
                actions: [
                  {
                    name: 'validate',
                    text: 'Je Valide !',
                    type: 'button',
                    value: 'validate',
                  },
                ],
              },
            ],
          })
          .catch(console.error);
      }
    });
    res.setHeader('Content-Type', 'application/json');
    const data = {
      members: currentCartel.members,
    };
    res.send(JSON.stringify({
      status: 'success',
      data,
    }));
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
};

function setSelectedValueToMessage(originalMessage, callbackId, actionName, userInput) {
  const message = _.cloneDeep(originalMessage);
  message.attachments.map((attachment) => {
    if (attachment.callback_id === callbackId) {
      attachment.actions.map((action) => {
        if (action.name === actionName) {
          // eslint-disable-next-line no-param-reassign
          action.selected_options = [
            {
              text: userInput,
              value: userInput,
            },
          ];
        }
      });
    }
  });
  if (message.attachments.length === 5) {
    message.attachments.splice(message.attachments.length - 2, 1);
  }
  return message;
}

exports.setUpBirthdayWf = async (payload, respond) => {
  try {
    const userId = payload.user.id;
    const userInput = payload.actions[0].selected_options[0].value;
    const actionName = payload.actions[0].name;
    const updatedMessage = setSelectedValueToMessage(
      payload.original_message,
      payload.callback_id,
      actionName,
      userInput,
    );
    const birthdayWF = await BOBirthdayWF.findWFByAuthor(userId);
    if (birthdayWF) {
      birthdayWF[actionName] = userInput;
      await birthdayWF.save();
    } else {
      const newBirthdayWF = await BOBirthdayWF.createBirthday(userId);
      newBirthdayWF[actionName] = userInput;
      await newBirthdayWF.save();
    }
    return updatedMessage;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    respond({ text: 'Oups, something went wrong' });
  }
};

function confirmMessageValidation(originalMessage, birthdayWF) {
  const month = MonthService.monthNumToName(parseInt(birthdayWF.month, 10));
  const formattedDate = birthdayWF.year ? `${birthdayWF.day} ${month} ${birthdayWF.year}` : `${birthdayWF.day} ${month}`;
  const message = _.cloneDeep(originalMessage);
  // Remove last 3 attachments (i.e. day, month, year selects + validate button)
  message.attachments.splice(message.attachments.length - 3, 3);
  message.attachments.push({
    text: `C'est noté ton anniversaire *${formattedDate}* est bien enregistré :+1:`,
    color: '#3AA3E3',
  });
  return message;
}

exports.validateBirthday = async (payload, respond) => {
  try {
    const teamId = payload.team.id;
    const userId = payload.user.id;
    const birthdayWF = await BOBirthdayWF.findWFByAuthor(userId);
    // Si l'utilisateur a sélectionné au moins un jour et un mois
    if (birthdayWF && birthdayWF.day && birthdayWF.month) {
      const candidateBirthday = birthdayWF.year ? `${birthdayWF.year}-${birthdayWF.month}-${birthdayWF.day}` : `${birthdayWF.month}-${birthdayWF.day}`;
      const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
      const editedMember = _.find(currentCartel.members, { slack_uid: userId });
      editedMember.birthdate = candidateBirthday;
      await currentCartel.save();
      Workflow.deleteExistingWFAuthor(userId);
      return confirmMessageValidation(payload.original_message, birthdayWF);
    }
    // Si on a pas encore ajouté de message d'erreur
    if (payload.original_message.attachments.length < 5) {
      const message = _.cloneDeep(payload.original_message);
      const warning = {
        text: '*Oups* il faut a minima saisir le jour et le mois de ton anniversaire',
        color: '#3AA3E3',
      };
      message.attachments.splice(message.attachments.length - 1, 0, warning);
      return message;
    }
    /* const slack = await SlackInstance.getClientByTeamId(teamId);
    slack.chat.postMessage({
      channel: payload.channel.id,
      text: `Hello l'équipe! <@${userId}> anniversaire validé !`,
    }); */
    /* respond({
      channel: payload.channel.id,
      text: `Hello l'équipe! <@${userId}> anniversaire validé !`,
    }); */
    return payload.original_message;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    respond({ text: 'Oups, something went wrong' });
  }
};
