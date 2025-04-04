const express = require('express');
const TrainEventController = require('../controllers/train-event.controller');

const router = express.Router();

router.post('/create_train_event', TrainEventController.createTrainCommand);

module.exports = router;
