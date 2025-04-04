const NodeCache = require('node-cache');
const _ = require('lodash');
const RitualSpecs = require('../../db/models/ritual-specs');

module.exports = class MessageCache {
  constructor(ttlSeconds) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });
  }

  get(ritualType, key) {
    const value = this.cache.get(key);
    if (value) {
      return Promise.resolve(value);
    }
    return RitualSpecs.getSpecsByRitual(ritualType).then((specs) => {
      _.forEach(specs.messages, (mess) => {
        this.cache.set(mess.key, mess.value);
      });
      return this.cache.get(key);
    });
  }

  del(keys) {
    this.cache.del(keys);
  }

  delStartWith(startStr = '') {
    if (!startStr) {
      return;
    }
    const keys = this.cache.keys();
    _.forEach(keys, (key) => {
      if (key.indexOf(startStr) === 0) {
        this.del(key);
      }
    });
  }

  flush() {
    this.cache.flushAll();
  }
};
