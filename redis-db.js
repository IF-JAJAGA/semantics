var
  // App
  app = require('./app'),

  // Database
  redis = require('redis'),
  client,
  rtg;

if (process.env.REDISTOGO_URL) {
  // Heroku connection for redis
  rtg = require("url").parse(process.env.REDISTOGO_URL);
  client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(":")[1]);
} else {
  client = redis.createClient();
}

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
