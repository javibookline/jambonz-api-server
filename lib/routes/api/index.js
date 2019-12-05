const api = require('express').Router();

function isAdminScope(req, res, next) {
  if (req.user.hasScope('admin')) return next();
  res.status(403).json({
    status: 'fail',
    message: 'insufficient privileges'
  });
}

api.use('/ServiceProviders', isAdminScope, require('./service-providers'));
api.use('/VoipCarriers', isAdminScope, require('./voip-carriers'));
api.use('/PhoneNumbers', isAdminScope, require('./phone-numbers'));
api.use('/ApiKeys', require('./api-keys'));
api.use('/Accounts', require('./accounts'));
api.use('/Applications', require('./applications'));

module.exports = api;