var
  // Node API
  querystring = require('querystring'),

  // Custom dependencies
  request = require('request'),
  debug = require('debug')('dbpedia-spotlight'),
  _ = require('underscore'),

  result = {}, // Contains the result graph (all RDF triples)

  options,
  dbpediaOptions,
  param = {confidence: 0.1};



dbpediaRequest = _.extend({
  text: 'President Obama called Wednesday on Congress to extend a tax break for students included in last year\'s economic stimulus package, arguing that the policy provides more generous assistance.',
  confidence: 0.2,
  support: 20
}, param);

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
  var i,
    resourceUri;
  debug('Got response for ' + options.url);
  result = JSON.parse(body);

  for (i = 0; resource = result.Resources[i]; ++i) {
    resourceUri = resource['@URI'];
    // Change to live if response time is too slow
    resourceUri = resourceUri.replace(/^http:\/\/dbpedia/, 'http://live.dbpedia');
    resourceUri = querystring.escape(resourceUri);
    debug(resourceUri);

    // Getting all neighbors of the resource URI
    request('http://rdf-translator.appspot.com/convert/detect/rdf-json/' +
        resourceUri, function(err, res, body) {
      var
        graph = JSON.parse(body),
        key;

      // WARNING: it is impossible for 2 graphs (in this case) to have the same
      // subject, so we can safely merge them simply by adding all subject keys
      for (key in graph) {
        result[key] = graph[key];
      }
      debug(JSON.stringify(result));
    });
  }
});
