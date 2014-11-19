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
  debug('test');
  res.write('test');
  res.end();
});

module.exports = router;
