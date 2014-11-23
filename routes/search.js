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
  debug = require('debug')('search'),
  async = require('async'),
  _ = require('underscore'),

  // Node api
  crypto = require('crypto'),

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

makeEntity = function(object,lang) {
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

makePerson = function(object,lang) {
  lang = lang || 'en';
  var entity = {
    type: entityTypes.PERSON,
    name: object['http://dbpedia.org/property/name'][0].value,
  };
  return entity;
};

router.get('/', function(req,res,next) {
  var params = req.query,
      entities = [];
  debug('requête : ' + params.q);

  if(params.q == 'mark') {
    // Test d'affichage d'une personne
    var mark = require('../mark.json'),
        lang = 'fr',
        entity = _.extend({},makeEntity(mark,lang),makePerson(mark,lang));
    entities.push(entity);
  }

  if (req.accepts('text/html')) {
    res.render('search', {title: 'Résultats de la requête', inputValue: params.q, entities: entities});
  } else if (req.accepts('json')) {
    res.set('Content-Type', 'application/json');
    res.status('200').send(JSON.stringify({q: params.q, entities: entities}));
  } else {
    res.status('406').send('Not Acceptable');
  }
});

module.exports = router;
