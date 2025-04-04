const express = require('express');
const bodyParser = require('body-parser');
const CagnotteRoute = require('./cagnotte.route');
const TrainEventRoute = require('./train-event.route');

const router = express.Router();

router.use('/cagnotte', bodyParser.urlencoded({ extended: true }), CagnotteRoute);
router.use('/train_event', bodyParser.urlencoded({ extended: true }), TrainEventRoute);

module.exports = router;
