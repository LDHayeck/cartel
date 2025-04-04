/* eslint-disable */
const _ = require('lodash');
const chalk = require('chalk');
const dateFnc = require('date-fns');
const Cartel = require('../db/models/cartel');
const MsgService = require('../utils/messages/messages-service');
const SlackInstance = require('../utils/slack-instance');
const Workflow = require('../db/models/worflow/workflow-instance');
const SuggestOscarWF = require('../db/models/worflow/oscar-suggestion-new');
const OscarSuggestion = require('../db/models/suggestion-oscar');




const imageBaseURL = 'https://s3.eu-west-3.amazonaws.com/cartel-admin/oscar-images/';

exports.listOscarOfTheWeekAction = async (teamId, userId) => {
  try {
    const slack = await SlackInstance.getClientByTeamId(teamId);
    const oscarMsg = await MsgService.getOscarMessage('oscar-headline');
    oscarMsg.attachments = [];
    let rightOscar;
    const cartelOscars = await Cartel.getOscarByTeamId(teamId);
    const ritualInstances = cartelOscars.ritual_instances;
    if (cartelOscars.ritual_instances) {
      _.forEach(ritualInstances, (instance) => {
        if (dateFnc.isToday(instance.postDate)) {
          rightOscar = instance;
        }
      });


      if (rightOscar) {
        if (rightOscar.voters.indexOf(userId) > -1) {
          let candidateId;
          _.forEach(rightOscar.candidates, (candidate) => {
            if (candidate.voters.indexOf(userId) > -1) {
              candidateId = candidate.slack_uid;
            }
          });
          const votedMapping = {
            imgUrl: imageBaseURL + rightOscar.question_url,
            text: `Tu as déjà voté pour <@${candidateId}>!`,
          };
          const alreadyVoteMessage = await MsgService.getOscarMessage('oscar-post-vote-message', votedMapping);
          return alreadyVoteMessage;
        }  
        const map = {
          color: '#40b17a',
          text: 'Hello ! Chaque jeudi Cartel organise `l\'oscar du bureau` :trophy:\nVote pour désigner `Qui va remporter l\'award de Mr Propre ? D\'ailleurs, il n\'y aurait pas une tâche sur ce tableau ?!`\nRéponse vendredi 15h !\n\n_Tableau : Carré blanc sur fond blanc de Malevitch + logo de l\'emission M6 "c\'est du propre"_',
          image_url: imageBaseURL + rightOscar.question_url,
        };
        oscarMsg.attachments.push(map);
        const oscarDetails = await MsgService.getOscarMessage('list-disc-action-oscar');
        oscarDetails.actions[0].options = [];
        const userList = await slack.users.list();
        _.forEach(userList.members, (u) => {
          if (!u.is_bot && u.real_name !== 'slackbot') {
              oscarDetails.actions[0].options.push({
                text: u.real_name,
                value: u.id,
               });
            }
        });
        oscarMsg.attachments.push(oscarDetails);
      }
    }
    if (oscarMsg.attachments.length <= 0) {
      return { text: 'Rendez-vous Jeudi prochain pour l\'Oscar de La semaine' };
    }
    return oscarMsg;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.chooseCandidateForOscar = async (payload) => {
  try {
    const teamId = payload.team.id;
    const userId = payload.user.id;
    const selectedAction = payload.actions[0].selected_options;
    let candidateId;
    if (selectedAction) { candidateId = selectedAction[0].value; }
    if (!selectedAction) { candidateId = payload.actions[0].value; }
    let foundOscar;
    const foundOscars = await Cartel.getOscarByTeamId(teamId);
    _.forEach(foundOscars.ritual_instances, (oscar) => {
      if (dateFnc.isToday(oscar.postDate)) {
        foundOscar = oscar;
      }
    });

    if (foundOscar) {
      if (foundOscar.voters.indexOf(userId) > -1) {
        let candidateId;
        _.forEach(foundOscar.candidates, (candidate) => {
          if (candidate.voters.indexOf(userId) > -1) {
            candidateId = candidate.slack_uid;
          }
        });
        const votedMapping = {
          imgUrl: '',
          text: `Tu as déjà voté pour <@${candidateId}>!`,
        };
        const alreadyVoteMessage = await MsgService.getOscarMessage('oscar-post-vote-message', votedMapping);
        return alreadyVoteMessage;
      }
      const foundCandidate = _.find(foundOscar.candidates, { slack_uid: candidateId });
      const successMap = {
        channel: userId,
        candidate: candidateId
      }
      const alreadyVoteMessage = await MsgService.getOscarMessage('list-rituals-after-vote', successMap);
      if (foundCandidate) {
        foundCandidate.voteCount += 1;
        foundCandidate.voters.push(userId);
        foundOscar.voters.push(userId);
        await foundOscar.save();
        return alreadyVoteMessage;
      }
      const newCandidate = {
        slack_uid: candidateId,
        voteCount: 1,
        voters: [userId],
      };
      foundOscar.candidates.push(newCandidate);
      foundOscar.voters.push(userId);
      await foundOscar.save();
      return alreadyVoteMessage;
    }
    const noOscarMessage = { text: 'Pas d\'oscars cette semaine! :disappointed:' };
    return noOscarMessage;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.changeCandidateForOscar = async (payload) => {
  try {
    const teamId = payload.team.id;
    const userId = payload.user.id;
    const oscars = await Cartel.getOscarByTeamId(teamId);
    const action = payload.actions[0].value;
    let oscar;

    _.forEach(oscars.ritual_instances, (o) => {
      if (dateFnc.isToday(o.postDate)) {
        oscar = o;
      }
    });
    if (oscar) {
      if (action === 'modify_vote') {
        const indexOscar = oscar.voters.indexOf(userId);
        oscar.voters.splice(indexOscar, 1);
        _.forEach(oscar.candidates, (c) => {
          const indexCandidate = c.voters.indexOf(userId);
          if (indexCandidate > -1) {
            c.voters.splice(indexCandidate, 1);
            c.voteCount -= 1;
          }
        });
        await oscar.save();
        const response = await this.listOscarOfTheWeekAction(teamId);
        return response;
      }
      await Workflow.deleteExistingWFAuthor(userId);
      await SuggestOscarWF.createOscarSuggestion(userId);
      const resp = {
        replace_original: false,
        text: 'Quel Oscar veux-tu proposer? ',
      };
      return resp;
    }
    const noOscar = {
      replace_original: false,
      text: 'PAS D\'OSCAR CETTE SEMAINE',
    };
    return noOscar;
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.suggestOscarWF = async (foundWorkFlow, typedText) => {
  try {
    const txtMsg = typedText;
    const foundWF = foundWorkFlow;
    foundWF.suggestion = txtMsg;
    await foundWF.save();
  } catch (err) {
    console.error(chalk.red('Error ✗'), err);
  }
};

exports.validateWFOscarSuggestion = async (payload, respond) => {
  try {
  const testString = payload.callback_id;
  const teamId = payload.team.id;
  const userId = payload.user.id;
  const regexGroups = testString.match(/(oscar:)(\w*)(:validate_prop)/);
  const idWFSuggestion = regexGroups[2];
  const foundWFSuggestion = await SuggestOscarWF.getOscarSuggestionById(idWFSuggestion);
  const selectedAction = payload.actions[0].value;
  const slack = await SlackInstance.getClientByTeamId(teamId);

  if (foundWFSuggestion && selectedAction === 'validate_proposition') {
    await Workflow.deleteExistingWFAuthor(userId);
    const newSuggestion = await OscarSuggestion.createOscarSuggestion(foundWFSuggestion.suggestion, foundWFSuggestion.author, teamId);
    newSuggestion.save();
    const respMsg = await MsgService.getOscarMessage('list-rituals-after-suggestion', {channel: userId});
    respond(respMsg);
  } else if (foundWFSuggestion && selectedAction === 'cancel_proposition'){
    await Workflow.deleteExistingWFAuthor(userId);
    const respMsg = await MsgService.getCommonMessage('list-rituals-after-cancel', {channel: userId});
    respMsg.text = '*Daccord, ta proposition a bien été annulée*';
    respond(respMsg);
   }
}catch (err){
  console.error(chalk.red('Error ✗'), err);
}
}
/* eslint-enable */
