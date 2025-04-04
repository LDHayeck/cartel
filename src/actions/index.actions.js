const slackInteractiveMessages = require('@slack/interactive-messages');
const CagnotteController = require('../controllers/cagnotte.controller');
const TrainEventController = require('../controllers/train-event.controller');
const OnboardController = require('../controllers/onboard.controller');
const AnniversaireController = require('../controllers/anniversaire.controller');
const OscarController = require('../controllers/oscar.controller');
const BackofficeController = require('../controllers/backoffice.controller');
const SecretSantaController = require('../controllers/secret-santa.controller');


const slackMessages = slackInteractiveMessages.createMessageAdapter(
  process.env.SLACK_SIGNING_SECRET,
);

slackMessages.action('onboard:start', OnboardController.chooseAction);
// CAGNOTTE
slackMessages.action(/(cagnotte:)(\w*)(:select)/, CagnotteController.selectCagnotteAction);
slackMessages.action('cagnotte:add_new', CagnotteController.createCagnotteWF);
slackMessages.action(/(cagnotte:)(\w*)(:validate_new)/, CagnotteController.validateWFNewCagnotteAction);
// TRAIN EVENT
slackMessages.action(/(train_event:)(\w*)(:select)/, TrainEventController.selectTrainAction);
slackMessages.action('train_event:add_new', TrainEventController.openCreateTrainDialog);
slackMessages.action(/(dialog:)(\w*)(:submitt)/, TrainEventController.submittEventDialog);
// ANNIVERSAIRE
slackMessages.action(/(anniversaire:)(\w*)(:validate_modif)/, AnniversaireController.validateWFAnniversaireModifyWishAction);
slackMessages.action(/(anniversaire:)(\w*)(:select)/, AnniversaireController.selectAnniversaireAction);
slackMessages.action(/(anniversaire:)(\w*)(:validate_wish)/, AnniversaireController.validateWFAnniversaireWishAction);
slackMessages.action(/(anniversaire:)(\w*)(:modify_wish)/, AnniversaireController.initModifyWishWF);
// OSCAR
slackMessages.action(/(oscar:)(\w*)(:select)/, OscarController.chooseCandidateForOscar);
slackMessages.action(/(oscar:)(\w*)(:AfterVote)/, OscarController.changeCandidateForOscar);
slackMessages.action(/(oscar:)(\w*)(:validate_prop)/, OscarController.validateWFOscarSuggestion);
// BACKOFFICE
slackMessages.action('bo_birthdate', BackofficeController.validateBirthday);
slackMessages.action('birth_date_selection', BackofficeController.setUpBirthdayWf);
// SECRET SANTA
slackMessages.action('secretSanta:submitt', SecretSantaController.createSecretSanta);
slackMessages.action('secretSanta:dialog', SecretSantaController.openSecretSantaDialog);
slackMessages.action(/(secretSanta:)(\w*)(:participate)/, SecretSantaController.selectSecretSantaAction);
slackMessages.action(/(secretSanta:)(\w*)(:action)/, SecretSantaController.adminSecretSantaAction);
slackMessages.action(/(secretSanta:)(\w*)(:closed)/, SecretSantaController.afterSignUpCloseAction);
module.exports = slackMessages;
