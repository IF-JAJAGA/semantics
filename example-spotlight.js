var spotlight = require('./spotlight'),
  toSpotlight = require('./testToSpotlight'),
  request = require('request'),
  debug = require('debug')('example'),

  i,
  uri;

spotlight.getGraph({
  pages: toSpotlight.pages,
  live: true,
  confidence: 0.3,
  support: 20
}, function(err, graphs) {
  if (err) throw err;

  delete toSpotlight.pages;
  for (var key in graphs) {
    debug(key);
    toSpotlight.results = graphs;
  }
  debugger;
  console.log(JSON.stringify(toSpotlight));
});
