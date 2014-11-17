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
  debug = require('debug')('pages'),
  async = require('async'),

  // Node api
  crypto = require('crypto'),

  // Functions
  notFound;

/**
 * @callback nextCallback
 * @param {*} [err] - Information about the error (evaluates to false if OK)
 * @param {number} [status=500] - Status code for HTTP response
 */

/**
 * Puts the correct message and status for a not found error
 * @param {Error} err - The error (with the resource name as message)
 * @return {!Error} The error with correct code and message
 */
notFound = function(err) {
  err.message += ' could not be found';
  err.status = 404;
  return err;
};

/**
 * @callback requestCallback
 * @param {!Object} req - The request that triggered this callback
 * @param {!Object} res - The response to send to the client that requested it
 * @param {nextCallback} [next] - Next step to do after this callback
 */

/**
 * GET pages listing: displays HTML of the list of pages in the database
 * @param {string} path - The path to match for the callback to be triggered
 * @param {requestCallback} cb - The callback that handles the response
 */
router.get('/', function(req, res, next) {
  var pages = [];
  debug('Getting all pages');
  redis.lrange('pages', 0, -1, function(err, replies) {
    if (err) return next(new Error(err));
    var i,
      reply;

    for (i = 0, reply; reply = replies[i]; ++i) {
      pages.push({id: reply.replace(/^page:/, '')});
    }

    debug('pages: ', pages);
    if (req.accepts('text/html')) {
      res.render('pages', {title: 'Liste des pages', pages: pages});
    } else if (req.accepts('json')) {
      res.set('Content-Type', 'application/json');
      res.status('200').send(JSON.stringify({pages: pages}));
    } else {
      res.status('406').send('Not Acceptable');
    }
  });
});

/**
 * PUT (creates) new page with :id, and attributes in parameter.
 *     The response is either 200 (OK), 404 (Not Found) or 500 (database error)
 */
router.put('/:id', function(req, res, next) {
  var id = req.params.id,
    shasum = crypto.createHash('sha1'),
    hId;

  // Hashing the id with SHA1 strategy
  shasum.update(id);
  hId = shasum.digest('hex');

  debug('Creating page of id: ' + id);

  async.waterfall([
    function(cb) {
      redis.exists('page:' + hId, cb);
    },

    // Checking that the page is new and that the parameters are OK
    function(pageExists, cb) {
      var key;
      if (pageExists) return cb(new Error('Page ' + id + ' already exists'));

      debug('req.params', req.params);
      debug('req.body', req.body);

      if (Object.getOwnPropertyNames(req.body).length === 0) {
        return cb(new Error('Body is empty: no attributes to add'));
      }

      // Sending multi for transaction
      cb(null, redis.multi());
    },

    // Adding a new set with all parameters as hash values in a transaction
    function(multi, cb) {
      debug('Multi object created');
      // Constructing a table for each key value pair
      var pairs = [];
      for (key in req.body) {
        pairs.push({key: key, value: req.body[key]});
      }

      // Queuing all HSET to multi
      async.each(pairs, function(pair, cbAttribute) {
        multi.hset('page:' + hId, pair.key, pair.value);
        cbAttribute();
      }, function(err) {
        if (err) return cb(err);

        // Adding ID to the list of IDs
        multi.rpush('pages', id);

        debug('All creation commands queued');
        // Sending multi for commit
        cb(null, multi);
      });
    },

    // Committing transaction
    function(multi, cb) {
      multi.exec(cb);
    }],

    function(err, replies) {
      if (err) {
        // Something went wrong
        if (!err instanceof Error) err = new Error(err);
        return next(err);
      }

      debug('Transaction committed');
      // Everything went fine
      if (req.accepts('text/html')) {
        res.render('alert', {
          title: 'Création d\'une page',
          type: 'success',
          message: 'La page ' + id + ' a été créée avec succès.'
        });
      } else if (req.accepts('text/plain')) {
        res.set('Content-Type', 'text/plain');
        res.status('200').send('Page ' + id + ' successfully created\r\n');
      } else {
        res.status('406').send('Not Acceptable');
      }
    }
  );
});

/**
 * GET specific page by id: displays HTML information about one page
 * @param {string} path - The path to match for the callback to be triggered
 * @param {requestCallback} cb - The callback that handles the response
 */
router.get('/:id', function(req, res, next) {
  var
    err,
    id = req.params.id,
    shasum = crypto.createHash('sha1'),
    hId;

  // Hashing the id with SHA1 strategy
  shasum.update(id);
  hId = shasum.digest('hex');

  debug('Getting page of id: ', id);

  redis.exists('page:' + hId, function(err, pageExists) {
    if (err) return next(new Error(err));
    if (!pageExists) return next(notFound(new Error('Page ' + id)));

    redis.hgetall('page:' + hId, function(err, page) {
      if (err) return next(new Error(err));

      // Everythin went fine
      if (req.accepts('text/html')) {
        res.render('page', {
          title: 'Détail de la page',
          page: page,
          id: id
        });
      } else if (req.accepts('json')) {
        res.set('Content-Type', 'application/json');
        res.status('200').send(JSON.stringify({id: id, page: page}));
      } else {
        res.status('406').send('Not Acceptable');
      }
    });
  });
});

/**
 * POST (updates) the page of id = :id with the attributes in parameter.
 *     The response is either 200 (OK), 404 (Not Found) or 500 (database error)
 * @param {string} path - The path to match for the callback to be triggered
 * @param {requestCallback} cb - The callback that handles the response
 */
router.post('/:id', function(req, res, next) {
  var id = req.params.id,
    shasum = crypto.createHash('sha1'),
    hId;

  // Hashing the id with SHA1 strategy
  shasum.update(id);
  hId = shasum.digest('hex');

  debug('Updating page of id: ', id);
  redis.exists('page:' + hId, function(err, pageExists) {
    var key;
    if (err) return next(new Error(err));
    if (!pageExists) return next(notFound(new Error('Page ' + id)));

    // Updating existing attributes or creating new ones
    for (key in req.body) {
      redis.hset('page:' + hId, key, req.body[key]);
    }

    // Everything went fine
    if (req.accepts('text/html')) {
      res.render('alert', {
        title: 'Modification d\'une page',
        type: 'success',
        message: 'La page ' + id + ' a été modifiée avec succès.'
      });
    } else if (req.accepts('text/plain')) {
      res.set('Content-Type', 'text/plain');
      res.status('200').send('Page ' + id + ' successfully modified\r\n');
    } else {
      res.status('406').send('Not Acceptable');
    }
  });
});

/**
 * DELETE the page of id = :id
 * @param {string} path - The path to match for the callback to be triggered
 * @param {requestCallback} cb - The callback that handles the response
 */
router.delete('/:id', function(req, res, next) {
  var id = req.params.id,
    shasum = crypto.createHash('sha1'),
    hId;

  // Hashing the id with SHA1 strategy
  shasum.update(id);
  hId = shasum.digest('hex');

  debug('Deleting page of id: ', id);

  redis.exists('page:' + hId, function(err, pageExists) {
    var key;
    if (err) return next(new Error(err));
    if (!pageExists) return next(notFound(new Error('Page ' + id)));

    // Deleting atomically the ID from the list and the hash
    multi = redis.multi();
    multi.lrem('pages', 0, id);
    multi.del('page:' + hId);
    multi.exec(function(err, reply) {
      if (err) return next(new Error(err));

      // Everything went fine
      if (req.accepts('text/html')) {
        res.render('alert', {
          title: 'Suppression d\'une page',
          type: 'success',
          message: 'La page ' + id + ' a été supprimée avec succès.'
        });
      } else if (req.accepts('text/plain')) {
        res.set('Content-Type', 'text/plain');
        res.status('200').send('Page ' + id + ' successfully deleted\r\n');
      } else {
        res.status('406').send('Not Acceptable');
      }
    });

    });
});

module.exports = router;
