var express = require('express');
var router = express.Router();
var debug = require('debug')('pages');

var pages = [
  {uri: 'http://example.com/page1'},
  {uri: 'http://example.com/page2'},
  {uri: 'http://autre.com/example3'}
];

/* GET pages listing. */
router.get('/', function(req, res) {
  res.render('pages', {title: 'Liste des pages', pages: pages});
});

router.get('/:id', function(req, res, next) {
  var id = parseInt(req.params.id, 10);
  debug('id: ' + id);
  if (id - 1 < pages.length) {
    res.render('page', {
      title: 'Détail de la page ' + id,
      page: pages[id - 1]
    });
  }
  else {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
});

module.exports = router;
