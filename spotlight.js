/**
 * @fileoverview Allows to annotate a text using DBPedia spotlight
 */

var
  // Node API
  querystring = require('querystring'),

  // Custom dependencies
  request = require('request'),
  debug = require('debug')('dbpedia-spotlight'),
  progress = require('debug')('progress'),
  _ = require('underscore'),
  async = require('async'),

  cache = {},

  getGraphFromText,
  getDbpediaGraph,
  getText,
  getGraph,

  cacheGraphs = {},
  cacheSubGraphs = {};

/**
 * @callback doneCallback
 * @param {*} [err] - Information about the error (evaluates to false if OK)
 * @param {object} result - The result of the function
 */

/**
 * @param {object} options - The options (with at least the text)
 * @param {Array string} userOption.pages - The URIs to dereference and annotate
 * @param {number=0.2} userOption.confidence
 *   - Percentage of confidence required to allow result
 * @param {number=20} userOption.support
 *   - Number of wikipedia link referencing a result
 * @param {boolean=false} userOption.live
 *   - Whether to ask to live.dbpedia instead of dbpedia
 * @param {string=e37637f70668dafc97c8704df499c28826bb65cb} userOptions.apikey
 *   - Key to use to analyze URI (get text)
 * @param {doneCallback} done - Gives the result (or err if something was wrong)
 */
module.exports.getGraph = getGraph = function(userOptions, done) {
  var results = {},
    totalNb,
    doneNb;

  userOptions = _.extend({
    confidence: 0.2,
    support: 20,
    live: false,
    apikey: '3d37dccc5fa62c6af0e6f5978bb826c0ebdf1f30'
  }, userOptions);

  totalNb = userOptions.pages.length;
  doneNb = 0;
  async.each(userOptions.pages, function(pageUri, nextUri) {
    if (cacheGraphs.hasOwnProperty(pageUri) && cacheGraphs[pageUri]) {
      results[pageUri] = cacheGraphs[pageUri];
      return nextUri();
    }

    getText(pageUri, userOptions.apikey, function(err, text) {

      getGraphFromText(userOptions, text, function(err, graph) {
        if (err) {
          debug('Error for page ' + pageUri);
          debug(err.stack);
        }
        results[pageUri] = graph;
        ++doneNb;
        progress(doneNb + ' / ' + totalNb);
        nextUri();
      });

    })
  }, function(err) {
    if (err) return done(err);

    done(null, results);
  });
};

/**
 * Finds the text to analyze from a URI
 * @param {string} uri - URI to dereference
 * @param {doneCallback} next - Gives the text (or err if something was wrong)
 */
module.exports.getText = getText = function(uri, apikey, next) {
  var options = {
    url: 'http://access.alchemyapi.com/calls/url/URLGetText',
    method: 'GET',
    qs: {
      url: uri,
      apikey: apikey,
      outputMode: 'json'
    }
  };

  debug(options);

  request(options, function(err, res, body) {
    var result;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      err = e;
    }
    if (err) return next(new Error(err));

    if (parsed.text) debug('text OK for ' + options.qs.url);
    return next(null, parsed.text);
  });
};

module.exports.getGraphFromText = getGraphFromText
    = function(userOptions, text, cbResult) {
  // DBPedia Spotlight request options
  var options = {
    url: 'http://spotlight.dbpedia.org/rest/annotate',
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    },
    form: {
      text: text,
      confidence: userOptions.confidence,
      support: userOptions.support
    }
  };


  request(options, function(err, res, body) {
    var resources,
      key,
      i,
      entityUri,
      entitiesUris = [];

    if (err) return cbResult(new Error(err));

    try {
      resources = JSON.parse(body).Resources;
    } catch (e) {
      return cbResult(e);
    }
    if (undefined === resources) {
      debug('Nothing was found for ' + options.url);

      return cbResult(new Error('Unable to parse response of ' + options.url));
    } else {
      debug('Spotlight OK for ' + options.url);
    }

    for (i = 0; entityUri = resources[i] && resources[i]['@URI']; ++i) {
      if (!cacheSubGraphs.hasOwnProperty(entityUri)) {
        entitiesUris.push(entityUri);
        cacheSubGraphs[entityUri] = false;
      }
    }

    getDbpediaGraph(userOptions.live, entitiesUris, function(err, graph) {
      if (err) return cbResult(err);

      return cbResult(null, graph);
    });
  });
}

/**
 * Finds all neighbors in the DBPedia RDF graph for a list of URI from dbpedia
 * @param {boolean} live - Whether to add the live prefix for DBPedia
 * @param {Array} entitiesUris - List of DBPedia URIs (as strings)
 * @param {doneCallback} cbResult - Gives the result (or err if an error occurs)
 */
module.exports.getDbpediaGraph = getDbpediaGraph
    = function(live, entitiesUris, cbResult) {
  var graph = {};

  async.each(entitiesUris, function(entityUri, nextEntity) {
    var escapedUri;

    // Change to live can help if dbpedia is in maintenance
    if (live) {
      entityUri = escapedUri.replace(/^http:\/\/dbpedia/,
          'http://live.dbpedia');
    }
    escapedUri = querystring.escape(entityUri);

    if (cacheSubGraphs.hasOwnProperty(entityUri) && cacheSubGraphs[entityUri]) {
      // WARNING: it is impossible for 2 graphs (in this case) to have the same
      // subject, so we can safely merge them simply by adding all subject keys
      for (key in cacheSubGraphs[entityUri]) {
        graph[key] = cacheSubGraphs[entityUri][key];
      }
      if (!_.isEmpty(cacheSubGraphs[entityUri])) {
        debug('Cached value: ' + entityUri);
      }
      return nextEntity();
    }

    debug('Getting neighbors of ' + entityUri);
    // Getting all neighbors of the resource URI
    request('http://rdf-translator.appspot.com/convert/detect/rdf-json/' +
        escapedUri, function(err, res, body) {
      if (err) return nextEntity(new Error(err));
      var
        subGraph = {},
        key;

      try {
        subGraph = JSON.parse(body);
        cacheSubGraphs[entityUri] = subGraph;
      } catch (e) {
        debug('No neighbors for: ' + entityUri);
      }

      // WARNING: it is impossible for 2 graphs (in this case) to have the same
      // subject, so we can safely merge them simply by adding all subject keys
      for (key in subGraph) {
        graph[key] = subGraph[key];
      }
      if (!_.isEmpty(subGraph)) {
        debug('Got neighbors for: ' + entityUri);
      }
      return nextEntity();
    });
  }, function(err) {
    if (err) return cbResult(err);

    return cbResult(null, graph);
  });
};
