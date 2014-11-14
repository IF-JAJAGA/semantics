var
  // App
  app = require('../app'),

  // Database
  redis = app.get('redis client'),

  // Router
  express = require('express'),
  router = express.Router(),

  // Helper
  debug = require('debug')('pages');

/* GET pages listing */
router.get('/', function(req, res) {
  debug('Getting all pages');
  res.render('pages', {title: 'Liste des pages', pages: []});
});

/* GET specific page by id */
router.get('/:id', function(req, res, next) {
  var
    err,
    id = req.params.id;

  debug('Getting page of id: ' + id);

  redis.exists('page:' + id, function (errMessage, pageExists) {
    if (errMessage) {
      err = new Error(errMessage);
      err.status = 500;
      return next(err);
    }
    if (pageExists) {
      redis.hgetall('page:' + id, function (errMessage, page) {
        if (!errMessage) {
          res.render('page', {
            title: 'Détail de la page',
            page: page,
            id: id
          });
        } else {
          err = new Error(errMessage);
          err.status = 500;
          debug(err.stack);
          return next(err);
        }
      });
    }
    else {
      err = new Error('Page ' + id + ' not Found');
      err.status = 404;
      debug(err.stack);
      return next(err);
    }
  });
});

/* POST (updates) page of :id, and attributes in parameter */
router.post('/:id', function (req, res, next) {
  debug('Updating page of id: ' + req.params.id);
});

/* PUT (creates) new page with :id, and attributes in parameter */
router.put('/:id', function(req, res, next) {
  var id = req.params.id;
  debug('Creating page of id: ' + id);
  redis.exists('page:' + id, function (errMessage, pagesExists) {
    var key;
    if (!errMessage) {
      if (!pagesExists) {
        debug('Params: ' + JSON.stringify(req.params));
        debug('Body: ' + JSON.stringify(req.body));

        if (Object.getOwnPropertyNames(req.body).length === 0) {
          err = new Error('Body is empty: no attributes to add');
          err.status = 500;
          return next(err);
        }

        // Adding a new set with all parameters as hash values
        for (key in req.body) {
          redis.hset('page:' + id, key, req.body[key]);
        }

        // Everything went fine
        res.status(200).end();
      } else {
        err = new Error('Page ' + id + ' already exists.');
        err.status = 500;
        debug(err.stack);
        return next(err);
      }
    } else {
      err = new Error(errMessage);
      err.status = 500;
      debug(err.stack);
      return next(err);
    }
  });
});


module.exports = router;
