const express = require('express');
const BackofficeController = require('../controllers/backoffice.controller');
const requesterLegitimacyCheck = require('../middlewares/check-requester-legitimacy.guard');
const cartelFounderCheck = require('../middlewares/cartel-founder.guard');

const router = express.Router();

router.get('/cartels', cartelFounderCheck, BackofficeController.getCartels);
router.get('/cartel/:teamId/members', requesterLegitimacyCheck, BackofficeController.getCartelMembers);
router.post('/cartel/:teamId/members', requesterLegitimacyCheck, BackofficeController.editMemberInfoFromCartelById);
router.get('/cartel/:teamId/reminder/birthday', requesterLegitimacyCheck, BackofficeController.sendBirthdayFormReminder);


module.exports = router;
