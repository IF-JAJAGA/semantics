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
  getEntityType,
  getLocalizedProperty;

getLocalizedProperty = function(properties, lang) {
  var ret = _.find(properties, function(prop) {
    return prop.lang == lang;
  });
  return ret || properties[0];
};

getEntityType = function(graph) {
  var types = graph['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'];
  var isPerson = _.find(types, function(type) {
    return type.type == 'uri' && type.value == 'http://xmlns.com/foaf/0.1/Person';
  });
  if(isPerson) {
    return entityTypes.PERSON;
  }
  return null;
}

makeEntity = function(object,lang) {
  var entity = {
    type: getEntityType(object),
    label : getLocalizedProperty(object['http://www.w3.org/2000/01/rdf-schema#label'], lang).value,
    wikiUrl: object['http://xmlns.com/foaf/0.1/isPrimaryTopicOf'][0].value,
    abstract: getLocalizedProperty(object['http://dbpedia.org/ontology/abstract'], lang).value,
    description: getLocalizedProperty(object['http://www.w3.org/2000/01/rdf-schema#comment'], lang).value.slice(0,42)+'...',
    thumbnail: object['http://dbpedia.org/ontology/thumbnail'][0].value,
    image: object['http://xmlns.com/foaf/0.1/depiction'][0].value,
    caption: (object['http://dbpedia.org/property/caption'] || object['http://dbpedia.org/property/imageCaption'])[0].value
  };
  return entity;
};

makePerson = function(object,lang) {
  var entity = {
    description: getLocalizedProperty(object['http://purl.org/dc/elements/1.1/description'], lang).value
  };
  return entity;
};

router.get('/', function(req,res,next) {
  var params = req.query,
      lang = params.l || 'en',
      entities = [];
  debug('requête : ' + params.q);

  var terms = params.q.split(' ');
  if(terms.indexOf('mark') >= 0) {
    // Test d'affichage d'une personne
    var mark = require('../mark.json'),
        entity = _.extend({},makeEntity(mark,lang));
    if(entity.type = entityTypes.PERSON)
      entity = _.extend(entity,makePerson(mark,lang));
    entities.push(entity);
  }
  if(terms.indexOf('potato') >= 0) {
    // Test d'affichage d'une patate
    var potato = require('../potato.json'),
        entity = _.extend({},makeEntity(potato,lang));
    entities.push(entity);
  }

  if (req.accepts('text/html')) {
    res.render('search', {title: 'Résultats de la requête', inputValue: params.q, selectedLang: lang, entities: entities});
  } else if (req.accepts('json')) {
    res.set('Content-Type', 'application/json');
    res.status('200').send(JSON.stringify({q: params.q, entities: entities}));
  } else {
    res.status('406').send('Not Acceptable');
  }
});

module.exports = router;
