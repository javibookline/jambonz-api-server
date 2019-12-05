const router = require('express').Router();
const {DbErrorBadRequest} = require('../../utils/errors');
const ApiKey = require('../../models/api-key');
const decorate = require('./decorate');
const uuidv4 = require('uuid/v4');
const assert = require('assert');
const sysError = require('./error');
const preconditions = {
  'add': validateAddToken,
  'delete': validateDeleteToken
};

function validateAddToken(req) {
  if (req.user.hasScope('admin') && ('account_sid' in req.body)) {
    // ok
  }
  else if (req.user.hasScope('service_provider') &&
    (!('account_sid' in req.body) && !('service_provider_sid' in req.body))) {
    req.body['service_provider_sid'] = req.user.service_provider_sid;
  }
  else if (req.user.hasScope('account') && !req.user.hasScope('service_provider')) {
    delete req.body['service_provider_sid'];
    req.body['account_sid'] = req.user.account_sid;
  }
  req.body.token = uuidv4();
}

async function validateDeleteToken(req, sid) {
  const results = await ApiKey.retrieve(sid);
  if (0 == results.length) return;
  if (req.user.hasScope('admin')) {
    // can do anything
  }
  else if (req.user.hasScope('service_provider')) {
    if (results[0].service_provider_sid === null && results[0].account_sid === null) {
      throw new DbErrorBadRequest('a service provider user may not delete an admin token');
    }
    if (results[0].service_provider_sid && results[0].service_provider_sid != req.user.service_provider_sid) {
      throw new DbErrorBadRequest('a service provider user may not delete api key from another service provider');
    }
  }
  else {
    if (results[0].account_sid !== req.user.account_sid) {
      throw new DbErrorBadRequest('a user may not delete a token associated with a different account');
    }
  }
}

/**
 * need to handle here because response is slightly different than standard for an insert
 * (returning the token generated along with the sid)
 */
router.post('/', async(req, res) => {
  const logger = req.app.locals.logger;
  try {
    if ('add' in preconditions) {
      assert(typeof preconditions.add === 'function');
      await preconditions.add(req);
    }
    const uuid = await ApiKey.make(req.body);
    res.status(201).json({sid: uuid, token: req.body.token});
  } catch (err) {
    sysError(logger, res, err);
  }
});

decorate(router, ApiKey, ['delete'], preconditions);

module.exports = router;