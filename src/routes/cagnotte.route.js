const express = require('express');
const CagnotteController = require('../controllers/cagnotte.controller');

const router = express.Router();

router.post('/create_cagnotte', CagnotteController.createCagnotteCommand);
router.post('/add_to_cagnotte', CagnotteController.participateCagnotteCommand);

module.exports = router;
