var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', {title: 'Bienvenue sur le Semantics web (3.0)'});
});

module.exports = router;
