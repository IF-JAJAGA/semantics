var
  // App
  app = require('../app'),

  // Database
  redis = app.get('redis client'),

  // Router
  express = require('express'),
  router = express.Router(),

  // Helper
  debug = require('debug')('pages'),

  // Node api
  crypto = require('crypto');

/* GET pages listing */
router.get('/', function(req, res) {
  var pages = [];
  debug('Getting all pages');
  redis.lrange('pages', 0, -1, function (errMessage, replies) {
    var i;

    for (i in replies) {
      pages.push({
        id: replies[i].replace(/^page:/, '')
      });
    }
    debug(pages);
    res.render('pages', {title: 'Liste des pages', pages: pages});
  });
});

/* GET specific page by id */
router.get('/:id', function(req, res, next) {
  var
    err,
    id = req.params.id,
    shasum = crypto.createHash('sha1'),
    hId;

  // Hashing the id with SHA1 strategy
  shasum.update(id);
  hId = shasum.digest('hex');

  debug('Getting page of id: ' + id);

  redis.exists('page:' + hId, function (errMessage, pageExists) {
    if (errMessage) {
      err = new Error(errMessage);
      err.status = 500;
      return next(err);
    }
    if (pageExists) {
      redis.hgetall('page:' + hId, function (errMessage, page) {
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
  var id = req.params.id,
    shasum = crypto.createHash('sha1'),
    hId;

  // Hashing the id with SHA1 strategy
  shasum.update(id);
  hId = shasum.digest('hex');

  debug('Creating page of id: ' + id);
  redis.exists('page:' + hId, function (errMessage, pagesExists) {
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
          redis.hset('page:' + hId, key, req.body[key]);
        }
        redis.rpush('pages', id);

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
