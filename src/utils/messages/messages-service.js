const _ = require('lodash');
const CacheService = require('./cache-service');

const ttl = 60 * 60 * 12; // cache for 12 Hours
const messagesCache = new CacheService(ttl); // Create a new cache service instance

function parseMessage(messageObj, messageKeys) {
  if (!_.isNil(messageKeys)) {
    // Use lodash template method in order to set data into db message
    const compiler = _.template(JSON.stringify(messageObj));
    const compiled = compiler(messageKeys);
    return JSON.parse(compiled);
  }
  return messageObj;
}

exports.getCagnotteMessage = (messageId, messageKeys) => messagesCache.get('Cagnotte', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));

exports.getTrainMessage = (messageId, messageKeys) => messagesCache.get('TrainEvent', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));

exports.getCommonMessage = (messageId, messageKeys) => messagesCache.get('Common', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));

exports.getAnniversaireMessage = (messageId, messageKeys) => messagesCache.get('Anniversaire', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));

exports.getOscarMessage = (messageId, messageKeys) => messagesCache.get('Oscar', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));

exports.getSecretSantaMessage = (messageId, messageKeys) => messagesCache.get('SecretSanta', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));

exports.getWhiteList = (messageId, messageKeys) => messagesCache.get('Whitelist', messageId)
  .then(messageObj => parseMessage(messageObj, messageKeys));
