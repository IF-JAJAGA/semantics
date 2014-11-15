/**
 * @fileoverview Groups the routes for the top level of the hierarchy ('/')
 */

var
  // App
  app = require('../app'),

  // Router
  express = require('express'),
  router = express.Router();

module.exports = router;

/**
 * @callback nextCallback
 * @param {*} [err] - Information about the error (evaluates to false if OK)
 * @param {number} [status=500] - Status code for HTTP response
 */

/**
 * @callback requestCallback
 * @param {!Object} req - The request that triggered this callback
 * @param {!Object} res - The response to send to the client that requested it
 * @param {nextCallback} [next] - Next step to do after this callback
 */

/**
 * GET home page
 * @param {string} path - The path to match for the callback to be triggered
 * @param {requestCallback} cb - The callback that handles the response
 */
router.get('/', function(req, res) {
  res.render('index', {title: 'Bienvenue sur le Semantics web (3.0)'});
});
