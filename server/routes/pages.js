var express = require('express');
var router = express.Router();

var pages = [
  {uri: 'http://example.com/page1'},
  {uri: 'http://example.com/page2'},
  {uri: 'http://autre.com/example3'}
];

/* GET pages listing. */
router.get('/', function(req, res) {
  res.render('pages', {pages: pages});
});

module.exports = router;
