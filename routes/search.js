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
    PERSON: 'PERSON',
    OTHER: 'OTHER'
  },

  makeEntity,
  makePerson,
  getEntityType,
  getLocalizedProperty;

getProperty = function(object, property, lang) {
  var value = object[property];
  if(!value)
    return undefined;
  if(lang) {
    var ret = _.find(value, function(prop) {
      return prop.lang == lang;
    });
    return ret || value[0];
  }
  else {
    return value[0];
  }
};

getEntityType = function(graph) {
  var types = graph['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'];
  if(!types) {
    return null;
  }
  var isPerson = _.find(types, function(type) {
    return type.type == 'uri' && type.value == 'http://xmlns.com/foaf/0.1/Person';
  });
  if(isPerson) {
    return entityTypes.PERSON;
  }
  return entityTypes.OTHER;
}

makeEntity = function(object,lang) {
  var entity = {
    type: getEntityType(object),
    label : getProperty(object,'http://www.w3.org/2000/01/rdf-schema#label',lang).value,
    wikiUrl: getProperty(object,'http://xmlns.com/foaf/0.1/isPrimaryTopicOf').value,
    abstract: getProperty(object,'http://dbpedia.org/ontology/abstract',lang).value,
    description: getProperty(object,'http://www.w3.org/2000/01/rdf-schema#comment',lang).value.slice(0,42)+'...'
  };
  if(image = getProperty(object,'http://xmlns.com/foaf/0.1/depiction'))
    entity.image = image.value;
  if(caption = getProperty(object,'http://dbpedia.org/property/imageCaption'))
    entity.caption = caption.value;
  if(caption = getProperty(object,'http://dbpedia.org/property/caption'))
    entity.caption = caption.value;
  if(thumbnail = getProperty(object,'http://dbpedia.org/ontology/thumbnail'))
    entity.thumbnail = thumbnail.value;
  return entity;
};

makePerson = function(object,lang) {
  var entity = {
    description: getProperty(object,'http://purl.org/dc/elements/1.1/description',lang).value
  };
  return entity;
};

router.get('/', function(req, res, next) {
  var params = req.query,
      lang = params.l || 'en';
  debug('requête : ' + params.q);

  searchEngines.search(params.q, function(err, pages) {
    if (err) return next(new Error(err));
    debug('got table: ' + JSON.stringify(pages));
    //pages = ['http://en.wikipedia.com/wiki/Mark_Zuckerberg'];

    /*var terms = params.q.split(' ');
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
    }*/

    spotlight.getGraph({pages: pages, live: false, confidence: 0.3, support: 15}, function(err, graphs){
      var entities = [],
          leftValueObjects = {},
          objects = {},
          addToObjects = function(objects,object) {
            if(objects.hasOwnProperty(object)) {
              objects[object]++;
            }
            else {
              objects[object] = 1;
            }
          };

      //debug(JSON.stringify(graphs));
      for (url in graphs) {
        var graph = graphs[url];
        //debug('url : '+url);
        for (objectKey in graphs[url]) {
          var object = graphs[url][objectKey];
          debug('found for ' + objectKey);
          //debug(graphs[url]);
          addToObjects(objects,objectKey);
          leftValueObjects[objectKey] = object;
          for(predicateKey in object) {
            _.each(object[predicateKey], function(target) {
              if(target.type == 'uri')
                addToObjects(objects,target.value);
            });
          }
        }
        break;
      }

      var pairs = _.pairs(objects),
          sortedObjects = _.sortBy(pairs, function(obj) {
            return obj[1];
          }),
          bestObjectsReverse = _.last(sortedObjects,10),
          bestObjects = [];
      for(var i = (bestObjectsReverse.length-1); i>=0; i--) {
        bestObjects.push(bestObjectsReverse[i]);
      }
      debug('top objects :');
      _.each(bestObjects, function(value) {
        debug(value[0]+' : '+value[1]);
        for(objectKey in leftValueObjects) {
          if(objectKey == value[0]) {
            var entityType = getEntityType(leftValueObjects[objectKey]);
            if(entityType) {
              debug(objectKey+' detected as '+entityType);
              var entity = _.extend({}, makeEntity(leftValueObjects[objectKey], lang));
              entities.push(entity);
              break;
            }
          }
        }
      });

      if (req.accepts('text/html')) {
        res.render('search', {title: 'Résultats de la requête', inputValue: params.q, selectedLang: lang, entities: entities});
      } else if (req.accepts('json')) {
        res.set('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify({q: params.q, entities: entities}));
      } else {
        res.status(406).send('Not Acceptable');
      }
    });
  });
});

module.exports = router;
