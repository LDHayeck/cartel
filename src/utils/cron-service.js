/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

const cron = require('node-cron');
const _ = require('lodash');
const dateFnc = require('date-fns');
const dateFr = require('date-fns/locale/fr');
const chalk = require('chalk');
const SlackInstance = require('../utils/slack-instance');
const Cartel = require('../db/models/cartel');
const TrainEvent = require('../db/models/train-event');
const MsgService = require('../utils/messages/messages-service');

const imageBaseURL = 'https://s3.eu-west-3.amazonaws.com/cartel-admin/oscar-images/';
const SECRET_SANTA_BASE_URL = 'https://s3.eu-west-3.amazonaws.com/cartel-admin/secret-santa-images/';
const ANNIVERSAIRE_BASE_URL = 'https://s3.eu-west-3.amazonaws.com/cartel-admin/anniv-gifs/';


// EVENTS CRON TASKS
exports.watchTrainsEveryHour = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log(`CRON TASK 30 minutes(${dateFnc.format(new Date(), 'HH:mm')})`); // eslint-disable-line
      const cartels = await Cartel.find({});
      const trainsPromises = [];
      _.forEach(cartels, async (c) => {
        trainsPromises.push(Cartel.getCartelWithRitualsByTeamId(c.slack_team_id));
      });
      const cartelTrains = await Promise.all(trainsPromises);
      const dateNow = new Date();
      const dateThirty = dateFnc.addMinutes(dateNow, 30);
      const deadlineDelete = dateFnc.subMinutes(dateNow, 120);
      _.forEach(cartelTrains, (c) => {
        if (c.ritual_instances.length > 0) { // Cartel got trains
          SlackInstance.getClientByTeamId(c.slack_team_id)
            .then((slack) => {
              _.forEach(c.ritual_instances, async (train) => {
                try {
                  if (!train.warnThirtyMins
                    && dateFnc.isAfter(train.deadline, dateNow)
                    && dateFnc.isBefore(train.deadline, dateThirty)
                    && train.ritual_type === 'TrainEvent') {
                    const timeDeadline = dateFnc.format(
                      train.deadline,
                      'HH:mm',
                    );
                    train.warnThirtyMins = true; // eslint-disable-line
                    train.save();
                    slack.chat
                      .postMessage({
                        channel: train.channelTarget,
                        text: `L'event *${train.name}* organisé par <@${train.author}> a lieu dans les 30 prochaines minutes! (à *${timeDeadline}*)`,
                      });
                  } else if (dateFnc.isBefore(train.deadline, deadlineDelete) && train.ritual_type === 'TrainEvent') {
                    const trainIndex = _.findIndex(c.ritual_instances, { id: train.id });
                    await TrainEvent.findByIdAndRemove(train.id);
                    c.ritual_instances.splice(trainIndex, 1);
                    await c.save();
                  }
                } catch (err) {
                  console.error(chalk.red('Error ✗ : ', err));
                }
              });
            });
        }
      });
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

exports.watchTrainsEachDay = () => {
  cron.schedule('00 10 * * *', async () => {
    try {
      console.log(`CRON TASK 10:00 minutes(${dateFnc.format(new Date(), 'HH:mm')})`);  // eslint-disable-line
      const cartels = await Cartel.find({}); // Get All Teams
      const trainsPromises = [];
      _.forEach(cartels, async (c) => {
        trainsPromises.push(Cartel.getTrainEventByTeamId(c.slack_team_id));
      });
      const cartelTrains = await Promise.all(trainsPromises);
      _.forEach(cartelTrains, (c) => {
        if (c.ritual_instances.length > 0) { // Cartel got trains
          SlackInstance.getClientByTeamId(c.slack_team_id)
            .then((slack) => {
              _.forEach(c.ritual_instances, (train) => {
                if (dateFnc.isToday(train.deadline) && !train.warnThirtyMins) {
                  const timeDeadline = dateFnc.format(
                    train.deadline,
                    'HH:mm',
                  );
                  train.warnDDay = true; // eslint-disable-line 
                  train.save();
                  slack.chat
                    .postMessage({
                      channel: train.channelTarget,
                      text: `L'event *${train.name}* organisé par <@${train.author}> a lieu aujourd'hui à *${timeDeadline}*!`,
                    });
                }
              });
            });
        }
      });
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

exports.watchTrainsEveryWeek = () => {
  // Chaque semaine
  cron.schedule('00 14 * * *', async () => {
    try {
      console.log(`CRON TASK 10:00 minutes(${dateFnc.format(new Date(), 'HH:mm')})`);  // eslint-disable-line
      const cartels = await Cartel.find({});
      const trainsPromises = [];
      _.forEach(cartels, async (c) => {
        trainsPromises.push(Cartel.getTrainEventByTeamId(c.slack_team_id));
      });
      const cartelTrains = await Promise.all(trainsPromises);
      _.forEach(cartelTrains, (c) => {
        if (c.ritual_instances.length > 0) { // Cartel got trains
          SlackInstance.getClientByTeamId(c.slack_team_id)
            .then((slack) => {
              _.forEach(c.ritual_instances, (train) => {
                if (dateFnc.differenceInDays(train.deadline, new Date()) === 7 && !train.warnOneWeek) {
                  const timeDeadline = dateFnc.format(
                    train.deadline,
                    'HH:mm [le] dddd DD MMMM YYYY',
                    { locale: dateFr },
                  );
                  train.warnOneWeek = true; // eslint-disable-line 
                  train.save();
                  slack.chat
                    .postMessage({
                      channel: train.channelTarget,
                      text: `L'event *${train.name}* organisé par <@${train.author}> a lieu dans *1 semaine* à *${timeDeadline}!*`,
                    });
                }
              });
            });
        }
      });
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

exports.watchTrainsEachThreeWeeks = () => {
  // Chaque 3 semaine
  cron.schedule('00 11 * * *', async () => {
    try {
      console.log(`CRON TASK 10:00 minutes(${dateFnc.format(new Date(), 'HH:mm')})`);  // eslint-disable-line
      const cartels = await Cartel.find({});
      const trainsPromises = [];
      _.forEach(cartels, async (c) => {
        trainsPromises.push(Cartel.getTrainEventByTeamId(c.slack_team_id));
      });
      const cartelTrains = await Promise.all(trainsPromises);
      _.forEach(cartelTrains, (c) => {
        if (c.ritual_instances.length > 0) { // Cartel got trains
          SlackInstance.getClientByTeamId(c.slack_team_id)
            .then((slack) => {
              _.forEach(c.ritual_instances, (train) => {
                // eslint-disable-next-line max-len
                if (dateFnc.differenceInDays(train.deadline, new Date()) === 21 && !train.warnThreeWeeks) {
                  const timeDeadline = dateFnc.format(
                    train.deadline,
                    'HH:mm [le] dddd DD MMMM YYYY',
                    { locale: dateFr },
                  );
                  train.warnOneWeek = true; // eslint-disable-line 
                  train.save();
                  slack.chat
                    .postMessage({
                      channel: train.channelTarget,
                      text: `L'event *${train.name}* organisé par <@${train.author}> a lieu dans *3 semaine* à ${timeDeadline}!`,
                    });
                }
              });
            });
        }
      });
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};


// ANNIVERSAIRES CRON TASKS
exports.watchAnniversairesEachDay = () => {
  cron.schedule('00 10 * * *', async () => {
    try {
      console.log(`CRON TASK 10:00 minutes(${dateFnc.format(new Date(), 'HH:mm')})`);  // eslint-disable-line
      const cartels = await Cartel.find({});
      const bdaypromises = [];
      _.forEach(cartels, (c) => {
        bdaypromises.push(Cartel.getAnniversaireByTeamId(c.slack_team_id));
      });
      let i = 0;
      let j = 0;
      let k = 0;

      const cartelAnnivs = await Promise.all(bdaypromises);

      while (i < cartelAnnivs.length) {
        const c = cartelAnnivs[i];
        const slack = await SlackInstance.getClientByTeamId(c.slack_team_id); // eslint-disable-line
        if (c.ritual_instances.length > 0) {
          while (j < c.ritual_instances.length) {
            const anniv = c.ritual_instances[j];
            const foundMember = _.find(
              c.members, { slack_uid: anniv.owner },
            );
            const birthDate = dateFnc.parse(foundMember.birthdate, 'MM-dd');
            if (birthDate) {
              birthDate.setFullYear(new Date().getFullYear());
            }

            const respMsg = await MsgService.getAnniversaireMessage('anniv-wish-headline', { channel: 'general', ownerId: anniv.owner }); // eslint-disable-line
            if (dateFnc.isToday(birthDate)) {
              while (k < anniv.wish.length) {
                const a = anniv.wish[k];
                const mapping = {
                  channel: 'general',
                  wish: a.wish,
                  author: a.author,
                };
                const wishMessage = await MsgService.getAnniversaireMessage('anniv-wish-body', mapping); // eslint-disable-line
                const annivGifArrays = await MsgService.getAnniversaireMessage('anniv-gifs-array');
                const imageString = annivGifArrays[Math.floor(Math.random() * annivGifArrays.length)];
                const imageAttachment = {
                  replace_original: false,
                  color: '#40b17a',
                  text: '',
                  image_url: `${ANNIVERSAIRE_BASE_URL}${imageString}`,
                };
                respMsg.attachments.push(wishMessage);
                respMsg.attachments.push(imageAttachment);
                k += 1;
              }
              k = 0;
              anniv.wishBDay = true; // eslint-disable-line
              anniv.save();
              if (respMsg.attachments.length > 0) {
                slack.chat.postMessage({ channel: 'general', text: respMsg.text, attachments: respMsg.attachments });
              }
            }
            j += 1;
          }
        }
        i += 1;
        j = 0;
      }
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

exports.watchAnniversaireReminder = () => {
  cron.schedule('30 14 * * *', async () => {
    try {
      let diff = -1;
      const cartels = await Cartel.find({});
      const bdaypromises = [];
      let tomorrowBirthdays = [];
      const respMsg = await MsgService.getAnniversaireMessage('anniv-reminder-headline'); // eslint-disable-line
      _.forEach(cartels, (c) => {
        bdaypromises.push(Cartel.getAnniversaireByTeamId(c.slack_team_id));
      });
      const cartelAnnivs = await Promise.all(bdaypromises);
      for (const c of cartelAnnivs) { // eslint-disable-line
        let dateString;
        const slack = await SlackInstance.getClientByTeamId(c.slack_team_id); // eslint-disable-line
        if (c.members) {
          const cartelMembers = c.members;
            for (const member of cartelMembers) { // eslint-disable-line
            const now = new Date();
            const birthDate = dateFnc.parse(member.birthdate, 'MM-dd');
            if (birthDate) {
              birthDate.setFullYear(now.getFullYear());
            }
            diff = dateFnc.differenceInDays(birthDate, now);
            if (diff === 1 || dateFnc.isTomorrow(birthDate)) {
              tomorrowBirthdays.push(member);
            }
          }

          if (tomorrowBirthdays) {
              for (const member of cartelMembers) { // eslint-disable-line
              for (const t of tomorrowBirthdays) {
                const bdate = dateFnc.parse(t.birthdate, 'MM-dd');
                bdate.setFullYear(new Date().getFullYear());
                if (dateFnc.isTomorrow(bdate)) {
                  dateString = '`demain`';
                } else {
                  dateString = '`après demain`';
                  } // eslint-disable-line
                  if (t.slack_uid === member.slack_uid) { continue; } // eslint-disable-line
                const mapping = {
                  memberId: t.slack_uid,
                  date: dateString,
                };
                const foundAnniv = _.find(
                  c.ritual_instances,
                  { owner: t.slack_uid },
                );
                if (foundAnniv) {
                  const foundWish = _.find(foundAnniv.wish, { author: member.slack_uid });
                  if (foundWish) {
                    const map = {
                      memberId: t.slack_uid,
                      date: dateString,
                      memberWish: foundWish.wish,
                    };
                      const annivReminderModif = await MsgService.getAnniversaireMessage('anniv-modif-reminder', map); // eslint-disable-line
                    respMsg.attachments.push(annivReminderModif);
                  } else {
                      const annivReminderMessage = await MsgService.getAnniversaireMessage('anniv-reminder', mapping); // eslint-disable-line
                    respMsg.attachments.push(annivReminderMessage);
                  }
                  foundAnniv.didRemind = true;
                  foundAnniv.save();
                } else {
                    const annivReminderMessage = await MsgService.getAnniversaireMessage('anniv-reminder', mapping); // eslint-disable-line
                  respMsg.attachments.push(annivReminderMessage);
                }
              }
              if (respMsg.attachments.length > 0) {
                slack.chat.postMessage({
                  channel: member.slack_uid,
                  text: respMsg.text,
                  attachments: respMsg.attachments,
                  as_user: true,
                }); // eslint-disable-line
                respMsg.attachments = [];
              }
            }
            tomorrowBirthdays = [];
          }
        }
      }
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

// OSCARS CRON TASKS
exports.postOscar = () => {
  cron.schedule('00 11 * * Thursday', async () => {
    try {
      console.log(`CRON TASK 10:00 minutes(${dateFnc.format(new Date(), 'HH:mm')})`);  // eslint-disable-line
      const cartels = await Cartel.find({});
      const oscarPromises = [];
      const oscarMsg = await MsgService.getOscarMessage('oscar-headline');
      oscarMsg.attachments = [];
      _.forEach(cartels, (c) => {
        oscarPromises.push(Cartel.getOscarByTeamId(c.slack_team_id));
      });
      let i = 0;
      const cartelOscars = await Promise.all(oscarPromises);
      while (i < cartelOscars.length) {
        let oscarToday;
        const c = cartelOscars[i];
        if (c.ritual_instances.length > 0) {
          const slack = await SlackInstance.getClientByTeamId(c.slack_team_id); // eslint-disable-line
          _.forEach(c.ritual_instances, (instance) => { // eslint-disable-line
            if (dateFnc.isToday(instance.postDate)) {
              oscarToday = instance;
            }
          });

          if (oscarToday) {
            const map = {
              color: '#40b17a',
              text: 'Hello ! Chaque jeudi Cartel organise `l\'oscar du bureau` :trophy:\nVote pour désigner `Qui va remporter l\'award de Mr Propre ? D\'ailleurs, il n\'y aurait pas une tâche sur ce tableau ?!`\nRéponse vendredi 15h !\n\n_Tableau : Carré blanc sur fond blanc de Malevitch + logo de l\'emission M6 "c\'est du propre"_',
              image_url: imageBaseURL + oscarToday.question_url,
            };
            oscarMsg.attachments.push(map);
            const oscarDetails = await MsgService.getOscarMessage('list-disc-action-oscar'); // eslint-disable-line
            oscarDetails.actions[0].options = [];
            const userList = await slack.users.list(); // eslint-disable-line
            _.forEach(userList.members, (u) => {
              if (!u.is_bot && u.real_name !== 'slackbot') {
                oscarDetails.actions[0].options.push({
                  text: u.real_name,
                  value: u.id,
                });
              }
            });

            oscarMsg.attachments.push(oscarDetails);

            if (oscarMsg.attachments) {
              _.forEach(c.members, (member) => {
                slack.chat.postMessage({
                  channel: member.slack_uid,
                  text: oscarMsg.text,
                  attachments: oscarMsg.attachments,
                  as_user: true,
                });
              });
            }
          }
        }
        oscarMsg.attachments = [];
        i += 1;
      }
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

exports.postOscarResult = () => {
  cron.schedule('00 15 * * Friday', async () => {
    try {
      const cartels = await Cartel.find({});
      const oscarPromises = [];
      let i = 0;
      _.forEach(cartels, (c) => {
        oscarPromises.push(Cartel.getOscarByTeamId(c.slack_team_id));
      });
      const cartelOscars = await Promise.all(oscarPromises);
      while (i < cartelOscars.length) {
        const c = cartelOscars[i];
        let oscarYesterday;
        if (c.ritual_instances.length > 0) {
          const slack = await SlackInstance.getClientByTeamId(c.slack_team_id); // eslint-disable-line
          _.forEach(c.ritual_instances, (instance) => { // eslint-disable-line
            if (dateFnc.isYesterday(instance.postDate)) {
              oscarYesterday = instance;
            }
          });
          if (oscarYesterday && oscarYesterday.voters.length > 0) {
            let winner = {
              slack_uid: '',
              voteCount: 0,
              voters: [],
            };

            _.forEach(oscarYesterday.candidates, (candidate) => { // eslint-disable-line
              if (candidate.voteCount >= winner.voteCount) {
                winner = candidate;
              }
            });
            slack.chat.postMessage({
              channel: 'general',
              text: '',
              attachments: [{
                color: '#5b9aff',
                title: `Félicitaion <@${winner.slack_uid}> ! Tu es le roi / la reine du rangement, que deviendrait ce bureau sans toi ? :tada: !!!`,
                image_url: `${imageBaseURL}maniaque.gif`,
              },
              ],
            });
          }
        }
        i += 1;
      }
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

//  SECRET SANTA CRON TASKS

exports.watchSecretSantaOneWeek = () => {
  cron.schedule('45 17 * * *', async () => {
    try {
      const cartels = await Cartel.find({});
      const SecretSantaPromises = [];
      _.forEach(cartels, (c) => {
        SecretSantaPromises.push(Cartel.getSecretSantaByTeamId(c.slack_team_id));
      });
      const cartelSecretSantas = await Promise.all(SecretSantaPromises);
      _.forEach(cartelSecretSantas, (s) => {
        if (s.ritual_instances.length > 0) {
          SlackInstance.getClientByTeamId(s.slack_team_id)
            .then((slack) => {
              _.forEach(s.ritual_instances, (secretSanta) => {
                if (dateFnc.differenceInCalendarDays(secretSanta.eventDate, new Date()) === 7 && secretSanta.inscriptionStop) {
                  secretSanta.warnOneWeek = true; // eslint-disable-line 
                  secretSanta.save();
                  _.forEach(secretSanta.participants, (p) => {
                    slack.chat
                      .postMessage({
                        channel: p.slack_uid,
                        text: `Hello <@${p.slack_uid}> ! *Secret Santa* c'est dans \`1 semaine\` ! n'oublie pas d'acheter un cadeau :christmas_tree: :tada:`,
                        attachments: [
                          {
                            color: '#f96475',
                            text: '',
                            image_url: `${SECRET_SANTA_BASE_URL}chienMignon.gif`,
                          },
                          {
                            callback_id: `secretSanta:${secretSanta.id}:closed`,
                            text: 'Clique sur "Je veux savoir" pour découvrir à qui',
                            color: '#f96475',
                            actions: [
                              {
                                name: 'match',
                                text: 'Je veux savoir !',
                                type: 'button',
                                value: 'match_result',
                              },
                            ],
                          },
                        ],
                        as_user: true,
                      });
                  });
                }
              });
            });
        }
      });
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};

exports.watchSecretSantaTomorrow = () => {
  cron.schedule('00 18 * * *', async () => {
    try {
      const cartels = await Cartel.find({});
      const SecretSantaPromises = [];
      _.forEach(cartels, (c) => {
        SecretSantaPromises.push(Cartel.getSecretSantaByTeamId(c.slack_team_id));
      });
      const cartelSecretSantas = await Promise.all(SecretSantaPromises);
      _.forEach(cartelSecretSantas, (s) => {
        if (s.ritual_instances.length > 0) {
          SlackInstance.getClientByTeamId(s.slack_team_id)
            .then((slack) => {
              _.forEach(s.ritual_instances, (secretSanta) => {
                if (dateFnc.isTomorrow(secretSanta.eventDate) && secretSanta.inscriptionStop) {
                  secretSanta.warnOneDay = true; // eslint-disable-line 
                  secretSanta.save();
                  _.forEach(secretSanta.participants, (p) => {
                    slack.chat
                      .postMessage({
                        channel: p.slack_uid,
                        text: `Hello <@${p.slack_uid}> ! *Secret Santa* c'est déjà \`demain\` ! N'oublie pas d'amener ton cadeau. Ça va être bien :+1: :christmas_tree:`,
                        attachments: [
                          {
                            color: '#f96475',
                            text: '',
                            image_url: `${SECRET_SANTA_BASE_URL}santa_coming.gif`,
                          },
                          {
                            callback_id: `secretSanta:${secretSanta.id}:closed`,
                            text: 'Clique sur "Je veux savoir" pour découvrir à qui',
                            color: '#f96475',
                            actions: [
                              {
                                name: 'match',
                                text: 'Je veux savoir !',
                                type: 'button',
                                value: 'match_result',
                              },
                            ],
                          },
                        ],
                        as_user: true,
                      });
                  });
                }
              });
            });
        }
      });
    } catch (err) {
      console.error(chalk.red('Error ✗ : ', err));
    }
  });
};
