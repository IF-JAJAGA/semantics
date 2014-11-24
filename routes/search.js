/**
 * @fileoverview Groups the routes for the pages (in the hierarchy '/pages/')
 */

var
  // App
  app = require('../app'),
  searchEngines = require('../search-engines'),
  spotlight = require('../spotlight'),
  triImportance = require('../triImportance'),

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
  var matchingTriples = _.where(object.triples, {predicat: property});
  if(!matchingTriples.length)
    return {value: 'N/A'};
  var matchingLangTriples = _.where(matchingTriples, {lang: lang});
  if(matchingLangTriples.length) {
    return matchingLangTriples[0];
  }
  else {
    return matchingTriples[0];
  }
};

getEntityType = function(triples) {
  var typeTriples = _.where(triples, {predicat: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'});
  if(!typeTriples.length) {
    return null;
  }
  var isPerson = _.find(typeTriples, function(type) {
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
      lang = params.l || 'en',
      results = {};
  debug('requête : ' + params.q);

  // searchEngines.search(params.q, function(err, results) {
    results.pages = ["http://wiki.verkata.com/fr/wiki/Mark_Zuckerberg","http://en.wikipedia.com/wiki/Mark_Zuckerberg","https://www.facebook.com/zuck","http://www.forbes.com/profile/mark-zuckerberg/","http://www.biography.com/people/mark-zuckerberg-507402","https://twitter.com/finkd","http://www.youtube.com/watch?v=baeLtRZbwgY","http://www.crunchbase.com/person/mark-zuckerberg","http://topics.bloomberg.com/mark-zuckerberg/","http://content.time.com/time/specials/packages/article/0,28804,2036683_2037183_2037185,00.html"];
    // if (err) return next(new Error(err));
    debug('got table: ' + JSON.stringify(results.pages));
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

    spotlight.getGraph({pages: results.pages, live: false, confidence: 0.3, support: 15}, function(err, graphs){
      /*var entities = [],
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
      */

      var jsonOut = {
            "bestsList" : [],
            "subjectsList" : []
          },
          entities = [];
      triImportance.explore(graphs, jsonOut);
      triImportance.bestSubjects(jsonOut, 10);
      _.each(jsonOut.bestsList, function(i) {
        var object = jsonOut.subjectsList[i],
            entityType = getEntityType(object.triolets);
        debug('found : '+object.subject);
        if(entityType) {
          debug(object.subject+' detected as '+entityType);
          var entity = _.extend({}, makeEntity(object, lang));
          entities.push(entity);
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
  // });
});

module.exports = router;
