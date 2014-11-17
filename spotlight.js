/**
 * @fileoverview Allows to annotate a text using DBPedia spotlight
 */

var
  // Node API
  querystring = require('querystring'),

  // Custom dependencies
  request = require('request'),
  debug = require('debug')('dbpedia-spotlight'),
  _ = require('underscore'),
  async = require('async'),

  result = {}, // Contains the result graph (all RDF triples)

  annotate,
  handleResources,
  done;

/**
 * @callback doneCallback
 * @param {*} [err] - Information about the error (evaluates to false if OK)
 * @param {object} graph - The result graph of all detected entities
 */

/**
 * @param {object} options - The options (with at least the text)
 * @param options.text {string!} - The text to annotate
 * @param options.confidence {number=0.2}
 *   - Percentage of confidence required to allow result
 * @param options.support {number=20}
 *   - Number of wikipedia link referencing a result
 * @param options.live {boolean=false}
 *   - Whether to ask to live.dbpedia instead of dbpedia
 * @param {doneCallback} done - Gives the result (or err if something was wrong)
 */
module.exports.annotate = function(dbpediaOptions, doneCallback) {
  // Global variable for the done callback
  done = doneCallback;

  dbpediaRequest = _.extend({
    confidence: 0.2,
    support: 20
  }, dbpediaOptions);

  // DBPedia Spotlight request options
  options = {
    url: 'http://spotlight.dbpedia.org/rest/annotate',
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    },
    body: querystring.stringify(dbpediaRequest)
  };
  request(options, function(err, res, body) {
    debug('Got response for ' + options.url);
    if (err) return done(new Error(err));

    handleResources(JSON.parse(body).Resources);
  });
};

handleResources = function(resources) {
  var result = {};

  async.each(resources, function(resource, next) {
    var resourceUri = resource['@URI'],
      escapedUri = resourceUri;
    // Change to live if response time is too slow
    escapedUri = escapedUri.replace(/^http:\/\/dbpedia/,
        'http://live.dbpedia');
    escapedUri = querystring.escape(escapedUri);
    debug(resourceUri);

    // Getting all neighbors of the resource URI
    request('http://rdf-translator.appspot.com/convert/detect/rdf-json/' +
        resourceUri, function(err, res, body) {
      if (err) return next(new Error(err));
      var
        graph = {},
        key;

      try {
        graph = JSON.parse(body);
      } catch (err) {
        debug('No information for: ' + resourceUri);
      }

      // WARNING: it is impossible for 2 graphs (in this case) to have the same
      // subject, so we can safely merge them simply by adding all subject keys
      for (key in graph) {
        result[key] = graph[key];
      }
      if (!_.isEmpty(graph)) {
        debug('done processing: ' + resourceUri);
      }
      next();
    });
  }, function(err) {
    if (err) return done(new Error(err));

    done(result);
  });
}
