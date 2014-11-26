var
  app = require('./test'),
  test = {},
  async = require('async');

app.get('/', function(req,res,next) {
  async.each(['a','b','c'], function(item, next) {
    test.autre = item;
    next();
  },
  function (err) {
    console.log('objet prêt');
    res.send('objet prêt');
  });
});

module.exports.test = test;
