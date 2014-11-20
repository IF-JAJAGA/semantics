/**
 * @fileoverview Groups the routes for the pages (in the hierarchy '/pages/')
 */

var
  // App
  app = require('../app'),

  // Database
  redis = app.get('redis client'),

  // Router
  express = require('express'),
  router = express.Router(),

  // Helper
  debug = require('debug')('search'),
  async = require('async'),

  // Node api
  crypto = require('crypto');

router.get('/', function(req,res,next) {
  var params = req.query;
  debug('requête : ' + params.q);
  if (req.accepts('text/html')) {
    res.render('search', {title: 'Résultats de la requête', inputValue: params.q});
  } else if (req.accepts('json')) {
    res.set('Content-Type', 'application/json');
    res.status('200').send(JSON.stringify({q: params.q}));
  } else {
    res.status('406').send('Not Acceptable');
  }
});

module.exports = router;
