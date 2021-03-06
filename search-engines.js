var API_KEY = 'AIzaSyAsKc9-6FZUvpKPPq39dYUHcHIPUPy6fKU';

var request = require('request'),
  async = require('async'),
  _ = require('underscore'),
  debug = require('debug')('search-engines'),
  fs = require('fs'),

  google = require('node-google-api')({
    apiKey: API_KEY,
    debugMode: true // Throws errors instead of passing them silently.
  }),

  // Functions
  search,
  handleResources,

  CX = '016583123162265953650:aiks_s3sch8',
  cacheRequests = {};

module.exports.cacheRequests = cacheRequests;

require('./save-cache').loadCache('requests.json', function (err, requests) {
  if (err) debug(err);
  cacheRequests = requests;
});

module.exports.search = search = function(query, done) {
	if(cacheRequests.hasOwnProperty(query) && cacheRequests[query]){
		return done(null, cacheRequests[query]);	//TODO Vérifier que ça marche
	}
  google.build(function(api) {
    api.customsearch.cse.list({cx: CX, q: query, auth: API_KEY}, function(result) {
      var uri_tab = [],
        result_graph,
        i;
      if(result.error){
        debug('An error occured', result);
        return;
      }

      for(i in result.items){
        uri_tab.push(result.items[i].link);
      }


      handleResources(uri_tab, function(err, result_g){
        var json_final;
        //console.log(JSON.stringify(result_g,undefined,4));
        result_graph = result_g;
        json_final = {request: result.queries.request[0].searchTerms,
            results : result_graph,
            pages: uri_tab};

        cacheRequests[query] = json_final;
        return done(null, json_final);
      });
    });
  });
}

/**
* Finds all neighbors in the DBPedia RDF graph for a list of URI from dbpedia
* @param {Array} resources - List of URI (as strings)
* @param {doneCallback} done - Gives the result (or err if something was wrong)
*/
handleResources = function(resources, done) {
  var result = {};
  async.each(resources,
    function(resource, next) {
      // Getting all neighbors of the resource URI
      request('http://rdf-translator.appspot.com/convert/detect/rdf-json/' +
      resource,
      function(err, res, body) {
        if (err) return next(new Error(err));
        var graph , key;

        try {
          graph = JSON.parse(body);
        } catch (err) {
        }
        if(graph !== undefined){
          //console.log(JSON.stringify(graph, undefined, 2));
          // WARNING: it is impossible for 2 graphs (in this case) to have the same
          // subject, so we can safely merge them simply by adding all subject keys

          for (key in graph) {
            result[key] = graph[key];
          }
          if (!_.isEmpty(graph)) {
            debug('done processing: ' + resource);
          }
        }
        next();

      }
    );
  },
  function(err) {
    if (err) return done(new Error(err));

    done(null, result);
  }
);
}
