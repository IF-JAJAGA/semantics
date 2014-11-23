/**
 * @fileoverview Groups the routes for the pages (in the hierarchy '/pages/')
 */

var
  // App
  app = require('../app'),
  searchEngines = require('../search-engines'),
  spotlight = require('../spotlight'),

  // Router
  express = require('express'),
  router = express.Router(),

  // Helper
  debug = require('debug')('search'),
  _ = require('underscore'),

  entityTypes = {
    PERSON: 'PERSON'
  },

  makeEntity,
  makePerson,
  getLocalizedProperty;

getLocalizedProperty = function(properties, lang) {
  return _.find(properties, function(prop) {
    return prop.lang == lang;
  });
};

makeEntity = function(object, lang) {
  lang = lang || 'en';
  var entity = {
    wikiUrl: object['http://xmlns.com/foaf/0.1/isPrimaryTopicOf'][0].value,
    abstract: getLocalizedProperty(object['http://dbpedia.org/ontology/abstract'], lang).value,
    thumbnail: object['http://dbpedia.org/ontology/thumbnail'][0].value,
    image: object['http://xmlns.com/foaf/0.1/depiction'][0].value,
    caption: object['http://dbpedia.org/property/caption'][0].value
  };
  entity.abstractShort = entity.abstract.slice(0,242) + '...';
  return entity;
};

makePerson = function(object, lang) {
  lang = lang || 'en';
  var entity = {
    type: entityTypes.PERSON,
    name: object['http://dbpedia.org/property/name'][0].value,
  };
  return entity;
};

router.get('/', function(req, res, next) {
  var params = req.query,
      entities = [],
      key;
  debug('requête : ' + params.q);

  searchEngines.search(params.q, function(err, pages) {
    var mark,
      lang = 'fr',
      entity;

    if (err) return next(new Error(err));

    debug('got table: ' + JSON.stringify(pages));
    pages = ['http://en.wikipedia.com/wiki/Mark_Zuckerberg'];

    if (params.q == 'mark') {
      // Test d'affichage d'une personne
      mark = require('../mark.json');
      lang = 'fr';
      entity = _.extend({}, makeEntity(mark,lang), makePerson(mark,lang));
      entities.push(entity);
      res.render('search', {title: 'Résultats de la requête', inputValue: params.q, entities: entities});
      return;
    }

    spotlight.getGraph({pages: pages, live: true}, function(err, graphs){
      for (url in graphs) {
        for (key in graphs[url]) {
          debug('found for ' + key);
          entity = _.extend({}, makeEntity(graphs[key], lang), makePerson(graphs[key],lang));
          entities.push(entity);

          if (req.accepts('text/html')) {
            res.render('search', {title: 'Résultats de la requête', inputValue: params.q, entities: entities});
          } else if (req.accepts('json')) {
            res.set('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify({q: params.q, entities: entities}));
          } else {
            res.status(406).send('Not Acceptable');
          }
        }
        break;
      }
    });
  });
});

module.exports = router;
