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
  handleResources;

/**
 * @callback doneCallback
 * @param {*} [err] - Information about the error (evaluates to false if OK)
 * @param {object} graph - The result graph of all detected entities
 */

/**
 * @param {object} options - The options (with at least the text)
 * @param userOption.text {string!} - The text to annotate
 * @param userOption.confidence {number=0.2}
 *   - Percentage of confidence required to allow result
 * @param userOption.support {number=20}
 *   - Number of wikipedia link referencing a result
 * @param userOption.live {boolean=false}
 *   - Whether to ask to live.dbpedia instead of dbpedia
 * @param {doneCallback} done - Gives the result (or err if something was wrong)
 */
module.exports.annotate = function(userOptions, done) {
  var reqOptions;

  userOptions = _.extend({
    confidence: 0.2,
    support: 20,
    live: false
  }, userOptions);

  reqOptions = {
    confidence: userOptions.confidence,
    support: userOptions.support,
    text: userOptions.text
  };

  // DBPedia Spotlight request options
  options = {
    url: 'http://spotlight.dbpedia.org/rest/annotate',
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    },
    body: querystring.stringify(reqOptions)
  };
  request(options, function(err, res, body) {
    var resources;
    debug('Got response for ' + options.url);
    try {
      resources = JSON.parse(body).Resources;
    } catch (e) {
      debug(body);
      err = e;
    }
    if (err) return done(new Error(err));
    handleResources(JSON.parse(body).Resources, done);
  });
};

/**
 * Finds all neighbors in the DBPedia RDF graph for a list of URI from dbpedia
 * @param {Array} resources - List of URI (as strings)
 * @param {doneCallback} done - Gives the result (or err if something was wrong)
 */
handleResources = function(resources, done) {
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

    done(null, result);
  });
}
