const express = require('express');
const AuthController = require('../controllers/auth.controller');

const router = express.Router();

router.get('/', AuthController.getSlackButton);

router.get('/slack', AuthController.authenticateBot);

router.get(
  '/slack/callback',
  AuthController.authenticateTeam,
  AuthController.onAuthTeamSuccess,
  AuthController.onAuthTeamFail,
);

router.get(
  '/backoffice/callback',
  AuthController.loginUser,
  AuthController.onLoginSuccess,
  AuthController.onLoginFail,
);

module.exports = router;
