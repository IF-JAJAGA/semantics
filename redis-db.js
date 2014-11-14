var
  // App
  app = require('./app'),

  // Database
  redis = require('redis'),
  client = redis.createClient();

app.set('redis', redis);
app.set('redis client', client);

module.exports = function (req, res, next) {
  client.on('error', function (message) {
    var err = Error(message);
    err.status = 500;
    return next(err);
  });

  return next();
}
