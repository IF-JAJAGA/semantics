var
  // App
  app = require('../app'),

  // Router
  express = require('express'),
  router = express.Router();

module.exports = router;

/* GET home page */
router.get('/', function(req, res) {
  res.render('index', {title: 'Bienvenue sur le Semantics web (3.0)'});
});
