/* eslint-disable  no-console */
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load(); // eslint-disable-line global-require
}
// Libs for launching server
const http = require('http');
const express = require('express'); // Gerer les middlewares
const mongoose = require('mongoose'); // db mongodb
const chalk = require('chalk'); // Console.log plus jolies
const bodyParser = require('body-parser');
const cors = require('cors');
const cronService = require('./src/utils/cron-service');
const slackEvents = require('./src/events/index.events');
const slackMessages = require('./src/actions/index.actions');
const authRoutes = require('./src/routes/auth.route');
const boRoutes = require('./src/routes/backoffice.route');
const authCheck = require('./src/middlewares/jwt.guard');
// const caasRoutes = require('./src/routes/caas.routes');
const slashRoutes = require('./src/routes/slash-commandes.route');
const authController = require('./src/controllers/auth.controller');
const corsConf = require('./src/utils/cors-conf');

mongoose.connect(process.env.MONGODB_DATABASE_URL);
const { connection } = mongoose;
connection.on('error', console.error.bind(console, chalk.red('Error ✗')));
connection.once('open', async () => {
  console.log(chalk.green('Success ✓'), 'Connected to mongodb.');
});

authController.setSlackStrategy();

// Initialize  Express app
const app = express();

app.use(authController.initializePassport());

app.use('/auth', authRoutes);
app.use('/backoffice', corsConf.originUndefined, cors(corsConf.cors), authCheck, bodyParser.json(), boRoutes);
app.use('/slash_command', slashRoutes);
app.use('/slack/events', slackEvents.expressMiddleware());
app.use('/slack/actions', slackMessages.expressMiddleware());


// Event Cron Service
cronService.watchTrainsEveryHour();
cronService.watchTrainsEachDay();
cronService.watchTrainsEveryWeek();
cronService.watchTrainsEachThreeWeeks();
// Anniversaire Cron Service
cronService.watchAnniversairesEachDay();
cronService.watchAnniversaireReminder();
// Oscar Cron Service
cronService.postOscar();
cronService.postOscarResult();
// SECRET SANTA Cron Service
cronService.watchSecretSantaOneWeek();
cronService.watchSecretSantaTomorrow();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use('/caas', caasRoutes);

app.use((req, res) => {
  console.log('404 HANDLER: ', req.path);
  res.status(404).send({
    reason: 'Such route does not exists',
  });
});

const port = process.env.PORT || 4390;
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`); // eslint-disable-line no-console
});
