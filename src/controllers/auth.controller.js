// Libs for oauth authentication
const passport = require('passport');
const _ = require('lodash');
const chalk = require('chalk');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');
const SlackStrategy = require('@aoberoi/passport-slack').default.Strategy;
const Cartel = require('../db/models/cartel');
const SlackInstance = require('../utils/slack-instance');
const MsgService = require('../utils/messages/messages-service');
const AxiosWrapper = require('../utils/axios-wrapper');
const DreamTeamService = require('../utils/dream-team-service');

exports.getSlackButton = (req, res) => {
  res.send('<a href="/auth/slack"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>');
};


exports.setSlackStrategy = () => {
  passport.use(new SlackStrategy({
    clientID: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    skipUserProfile: true,
  }, async (accessToken, scopes, team, extra, profile, done) => {
    try {
      const foundCartel = await Cartel.findOne({ slack_team_id: team.id });
      if (_.isNil(foundCartel)) {
        const candidateCartel = {
          slack_team_id: team.id,
          slack_name: team.name,
          slack_api_token: extra.bot.accessToken,
          slack_team_token: accessToken,
        };
        const cartelCreation = await Cartel.create(candidateCartel);
        done(null, cartelCreation);
      }
      done(null, foundCartel);
    } catch (err) {
      done(null, err);
    }
  }));
};

exports.initializePassport = () => passport.initialize();

exports.authenticateBot = passport.authenticate('slack', {
  scope: ['search:read', 'bot', 'users:read', 'chat:write:bot', 'users:read.email', 'im:read', 'commands'], /* , 'identity.basic' */
});

exports.authenticateTeam = passport.authenticate('slack', {
  scope: ['users:read'],
  session: false,
});

exports.onAuthTeamSuccess = async (req, res) => {
  try {
    res.send('<meta http-equiv="refresh" content="0; URL=\'http://yourcartel.com/merci.html\'" />');
    const teamId = req.user.slack_team_id;
    const accessToken = req.user.slack_team_token;
    const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
    if (currentCartel && currentCartel.members.length === 0) {
      const slack = await SlackInstance.getClientByTeamId(teamId);
      const authList = await slack.auth.test({ token: accessToken });
      const userLists = await slack.users.list();
      _.forEach(userLists.members, async (member) => {
        if (member.id === 'USLACKBOT' || !member.real_name) { return; }
        if (!member.is_bot) {
          currentCartel.members.push({
            slack_uid: member.id,
            name: member.real_name,
            email: member.profile.email,
            admin: member.is_admin,
            owner: member.is_owner,
            birthdate: '',
            title: member.profile.title,
          });
        }
        const respMsg = await MsgService.getCommonMessage('welcome-message');
        slack.chat.postMessage({ channel: member.id, text: respMsg.text, attachments: respMsg.attachments, as_user: true }); // eslint-disable-line
      });
      currentCartel.slack_installer_name = authList.user;
      currentCartel.slack_installer_id = authList.user_id;
      await currentCartel.save();
    }
    const slackDreamTeam = await SlackInstance.getClientByTeamId('T7Z84HH3N');
    slackDreamTeam.chat.postMessage({
      channel: 'member_join',
      text: 'New Cartel Installed Join',
      attachments: [{
        color: '#f96475',
        text: `*Entreprise* : ${req.user.slack_name}\n*Nbre de Membres* : ${currentCartel.members.length}`,
      }],
    });
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
};

exports.onAuthTeamFail = (err, req, res) => {
  res.status(500).send(`<p>Cartel failed to install</p> <pre>${err}</pre>`);
};

exports.loginUser = async (req, res, next) => {
  const { code } = req.query;
  const postData = {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    redirect_uri: process.env.BACKOFFICE_LOGIN_REDIRECT_URL,
    code,
  };
  const postCode = await AxiosWrapper.axiosSlack.post('/oauth.access', querystring.stringify(postData));
  req.backOfficeAuth = postCode.data;
  next();
};

exports.onLoginSuccess = async (req, res, next) => {
  try {
    // const teamId = req.user.slack_team_id;
    const teamId = req.backOfficeAuth.team_id;
    const userId = req.backOfficeAuth.user_id;
    const currentCartel = await Cartel.getCartelMemberByTeamId(teamId);
    if (currentCartel && currentCartel.members.length > 0) {
      const foundMember = _.find(currentCartel.members, { slack_uid: userId });
      let userRole = 'customer';
      console.log('ON LOGIN SUCCESS member : ', foundMember);
      if (foundMember && DreamTeamService.isDreamTeamMember(foundMember.slack_uid)) {
        userRole = 'admin';
      }
      if (foundMember && foundMember.admin) {
        const token = jwt.sign({
          teamId,
          userId,
          isAuthenticated: true,
          username: foundMember.name,
          owner: foundMember.owner,
          userRole,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' });
        // return res.status(200).json({ token });
        return res.send(`<meta http-equiv="refresh" content="0; URL='${process.env.BASE_URL}/login?jwt=${token}'" />`);
      }
      req.failReason = 'not_admin';
    }
    next();
  } catch (err) {
    console.error(chalk.red('Error ✗ : ', err));
  }
};

exports.onLoginFail = (req, res) => {
  // eslint-disable-next-line
  console.log('LOGIN FAIL');
  return res.send(`<meta http-equiv="refresh" content="0; URL='${process.env.BASE_URL}/login?jwt=${req.failReason}'" />`);
};
