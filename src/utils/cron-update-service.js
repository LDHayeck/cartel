/* eslint-disable no-loop-func */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const cron = require('node-cron');
const _ = require('lodash');
const chalk = require('chalk');
const Cartel = require('../db/models/cartel');
const SlackInstance = require('../utils/slack-instance');


exports.updateCartelsUsers = () => {
  // Chaque semaine
  cron.schedule('00 14 * * Monday', async () => {
    try {
      console.log('UPDATE CRON TASK LAUNCHED');  // eslint-disable-line
      const cartels = await Cartel.find({});
      for (const cartel of cartels) {
        console.log('==================================', cartel.slack_name);
        const cartelMembers = [];
        const cartelDeletedMembers = [];
        const slack = await SlackInstance.getClientByTeamId(cartel.slack_team_id); // eslint-disable-line no-await-in-loop
        const userLists = await slack.users.list(); // eslint-disable-line no-await-in-loop
        _.forEach(userLists.members, async (member) => {
          if (member.id !== 'USLACKBOT' && !member.is_bot && member.profile.real_name) {
            if (member.deleted === false) {
              cartelMembers.push(member);
            }
            if (member.deleted === true) {
              cartelDeletedMembers.push(member);
            }
          }
        });

        _.forEach(cartelMembers, (user) => {
          const foundMember = _.find(cartel.members, { slack_uid: user.id });
          if (foundMember) {
            console.log(chalk.yellow('FOUND', user.profile.real_name));
            if (!foundMember.admin || !foundMember.owner || !foundMember.email || !foundMember.title) {
              foundMember.admin = user.is_admin;
              foundMember.owner = user.is_owner;
              foundMember.email = user.profile.email;
              foundMember.title = user.profile.title;
              console.log(chalk.blue('UPDATED', user.profile.real_name));
            }
          } else {
            cartel.members.push({
              slack_uid: user.id,
              name: user.profile.real_name,
              email: user.profile.email,
              admin: user.is_admin,
              owner: user.is_owner,
              birthdate: '',
              title: user.profile.title,
            });
            console.log(chalk.red('NOT FOUND MEMBER !', user.profile.real_name));
          }
        });
        await cartel.save(); // eslint-disable-line no-await-in-loop
      }
      console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ CRON TASK DONE +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};
