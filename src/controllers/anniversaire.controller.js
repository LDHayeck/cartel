const _ = require('lodash');
const chalk = require('chalk');
const dateFnc = require('date-fns');
const dateFr = require('date-fns/locale/fr');
const Cartel = require('../db/models/cartel');
const MsgService = require('../utils/messages/messages-service');
const Workflow = require('../db/models/worflow/workflow-instance');
const Anniversaire = require('../db/models/anniversaire');
const WishAnniversaireWF = require('../db/models/worflow/anniversaire-wish');
const ModifyWishWF = require('../db/models/worflow/anniversaire-modify-wish');
const SlackInstance = require('../utils/slack-instance');


exports.selectAnniversaireAction = async (payload, respond) => {
  const testString = payload.callback_id;
  const userId = payload.user.id;
  const regexGroups = testString.match(/(anniversaire:)(\w*)(:select)/);
  const idMember = regexGroups[2];
  const teamId = payload.team.id;
  const foundTeam = await Cartel.getCartelMemberByTeamId(teamId);
  let foundMember;
  const teamMembers = foundTeam.members;
  _.forEach(teamMembers, (instance) => {
    if (idMember === instance.slack_uid) {
      foundMember = instance;
    }
  });
  if (foundMember) {
    try {
      await Workflow.deleteExistingWFAuthor(userId);
      await WishAnniversaireWF.addWish(userId, foundMember.slack_uid);
      const respMsg = {
        replace_original: false,
        text: `Quel mot veux-tu laisser à *<@${foundMember.slack_uid}>* ?`,
      };
      respond(respMsg);
    } catch (err) {
      console.error(chalk.red('Error ✗'), err);
    }
  }
};

exports.initModifyWishWF = async (payload, respond) => {
  try {
    const testString = payload.callback_id;
    const userID = payload.user.id;
    const regexGroups = testString.match(/(anniversaire:)(\w*)(:modify_wish)/);
    const idMember = regexGroups[2];
    await Workflow.deleteExistingWFAuthor(userID);
    await ModifyWishWF.updateWish(userID, idMember);
    const respMsg = {
      replace_original: false,
      text: `Quel nouveau mot veux tu Ecrire à <@${idMember}> ?`,
    };
    respond(respMsg);
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.validateWFAnniversaireWishAction = async (payload, respond) => {
  try {
    const testString = payload.callback_id;
    const userId = payload.user.id;
    const teamId = payload.team.id;
    const slack = await SlackInstance.getClientByTeamId(teamId);
    const regexGroups = testString.match(/(anniversaire:)(\w*)(:validate_wish)/);
    const idWFAnnivWish = regexGroups[2];
    const foundWFAnnivWish = await WishAnniversaireWF.getAnnivById(idWFAnnivWish);
    const selectedAction = payload.actions[0].value;
    if (foundWFAnnivWish && selectedAction === 'validate') {
      await Workflow.deleteExistingWFAuthor(userId);
      const cartelAnniv = await Cartel.getAnniversaireByTeamId(teamId);
      const foundAnniv = _.find(
        cartelAnniv.ritual_instances,
        { owner: foundWFAnnivWish.owner },
      );
      if (!foundAnniv) {
        const newAnniv = await Anniversaire.createAnniv(foundWFAnnivWish.owner,
          foundWFAnnivWish.author, teamId);
        const newWish = {
          wish: foundWFAnnivWish.wish,
          author: foundWFAnnivWish.author,
        };
        newAnniv.wish.push(newWish);
        newAnniv.save();
        cartelAnniv.ritual_instances.push(newAnniv.id);
        await cartelAnniv.save();
        const mapping = {
          userId: payload.user.id,
        };
        const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-message-validated', mapping);
        respond(respMsg);
        const annivMsg = await this.onListAnniversaireAction(payload.team.id, userId);
        slack.chat.postMessage({
          channel: payload.channel.id,
          text: annivMsg.text,
          attachments: annivMsg.attachments,
          as_user: true,
        });
      } else {
        const newWish = {
          wish: foundWFAnnivWish.wish,
          author: foundWFAnnivWish.author,
        };
        foundAnniv.wish.push(newWish);
        await foundAnniv.save();
        const mapping = {
          userId: payload.user.id,
        };
        const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-message-validated', mapping);
        const annivMsg = await this.onListAnniversaireAction(payload.team.id, userId);
        slack.chat.postMessage({
          channel: payload.channel.id,
          text: annivMsg.text,
          attachments: annivMsg.attachments,
          as_user: true,
        });
        respond(respMsg);
      }
    } else if (foundWFAnnivWish && selectedAction === 'cancel') {
      await Workflow.deleteExistingWFAuthor(userId);
      const mapping = {
        userId: payload.user.id,
      };
      const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-message-cancel', mapping);
      respond(respMsg);
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.validateWFAnniversaireModifyWishAction = async (payload, respond) => {
  try {
    const testString = payload.callback_id;
    const userId = payload.user.id;
    const teamId = payload.team.id;
    const slack = await SlackInstance.getClientByTeamId(teamId);
    const regexGroups = testString.match(/(anniversaire:)(\w*)(:validate_modif)/);
    const idWFAnnivWish = regexGroups[2];
    const foundWF = await ModifyWishWF.getAnnivById(idWFAnnivWish);
    const selectedAction = payload.actions[0].value;
    if (foundWF && selectedAction === 'val') {
      await Workflow.deleteExistingWFAuthor(userId);
      const cartelAnniv = await Cartel.getAnniversaireByTeamId(teamId);
      const foundAnniv = _.find(
        cartelAnniv.ritual_instances,
        { owner: foundWF.owner },
      );

      const foundWish = _.find(foundAnniv.wish,
        {
          author: userId,
        });

      if (foundWish) {
        foundWish.wish = foundWF.wish;
        await foundAnniv.save();
        const mapping = {
          userId: payload.user.id,
        };
        const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-message-modified', mapping);
        respond(respMsg);
        const annivMsg = await this.onListAnniversaireAction(payload.team.id, userId);
        slack.chat.postMessage({
          channel: payload.channel.id,
          text: annivMsg.text,
          attachments: annivMsg.attachments,
          as_user: true,
        });
      } else {
        respond({ text: 'Oups! une Erreure est survenue !' });
      }
    } else if (foundWF && selectedAction === 'can') {
      await Workflow.deleteExistingWFAuthor(userId);
      const mapping = {
        userId: payload.user.id,
      };
      const respMsg = await MsgService.getAnniversaireMessage('anniversaire-new-disc-ok-message-cancelModif', mapping);
      respond(respMsg);
    }
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.addWishWF = async (foundWorkFlow, typedText) => {
  try {
    const txtMsg = typedText;
    const foundWF = foundWorkFlow;
    foundWF.wish = txtMsg;
    await foundWF.save();
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.modifyWishWF = async (foundWorkFlow, typedText) => {
  try {
    const txtMsg = typedText;
    const foundWF = foundWorkFlow;
    foundWF.wish = txtMsg;
    await foundWF.save();
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};


exports.onListAnniversaireAction = async (teamId, userId) => {
  try {
    let annivMsg = await MsgService.getAnniversaireMessage('anniv-headline');
    const cartelAnniv = await Cartel.getCartelMemberByTeamId(teamId);
    const anniv = await Cartel.getAnniversaireByTeamId(teamId);

    if (cartelAnniv.members) {
      const cartelMembers = cartelAnniv.members;
      const instancePromises = [];
      const myBdayPromise = [];
      _.forEach(cartelMembers, (instance) => {
        const now = new Date();
        const birthDate = dateFnc.parse(instance.birthdate, 'MM-dd');
        if (birthDate) {
          birthDate.setFullYear(now.getFullYear());
        }
        const diff = dateFnc.differenceInDays(birthDate, now);
        let date;
        if ((diff >= 0 && diff <= 14) || dateFnc.isTomorrow(birthDate)) {
          date = birthDate;
        } else {
          return;
        }

        let dateTxt = '';
        if (userId === instance.slack_uid) {
          const myMap = {
            userId,
            date: dateFnc.format(date, 'DD MMMM', { locale: dateFr }),
          };
          myBdayPromise.push(MsgService.getAnniversaireMessage('my-anniv-message', myMap));
          return;
        }
        if (dateFnc.isToday(date)) { dateTxt = '`aujourd\'hui`, '; }
        // eslint-disable-next-line no-extra-semi
        if (dateFnc.isTomorrow(date)) { dateTxt = '`demain`, '; }
        // eslint-disable-next-line no-extra-semi
        if (diff === 1) { dateTxt = '`après demain`, '; }

        const mapping = {
          memberId: instance.slack_uid,
          dateTxt,
          memberSlackUid: instance.slack_uid,
          memberBirthdate: dateFnc.format(date, 'DD MMMM', { locale: dateFr }),
        };
        const foundAnniv = _.find(
          anniv.ritual_instances,
          { owner: instance.slack_uid },
        );
        if (foundAnniv) {
          const foundWish = _.find(foundAnniv.wish, { author: userId });
          if (foundWish) {
            const map = {
              memberId: instance.slack_uid,
              memberSlackUid: instance.slack_uid,
              dateTxt,
              memberBirthdate: dateFnc.format(date, 'DD MMMM', { locale: dateFr }),
              memberWish: foundWish.wish,
            };
            instancePromises.push(MsgService.getAnniversaireMessage('anniversaire-modify-button', map));
          }
        } else {
          instancePromises.push(MsgService.getAnniversaireMessage('list-disc-action-anniversaire', mapping));
        }
      });

      const myBdayMessage = await Promise.all(myBdayPromise);
      const annivMessages = await Promise.all(instancePromises);
      let allMessages;
      if (annivMessages) {
        allMessages = myBdayMessage.concat(annivMessages);
      } else {
        allMessages = myBdayMessage;
      }
      annivMsg.attachments = allMessages;
    }
    if (annivMsg.attachments.length === 0) {
      annivMsg = await MsgService.getAnniversaireMessage('anniv-no-bday-comming-up');
    }
    return annivMsg;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
    return err;
  }
};
