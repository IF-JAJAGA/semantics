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
  progress = require('debug')('progress'),
  _ = require('underscore'),
  async = require('async'),

  entityTypes = {
    PERSON: 'PERSON',
    OTHER: 'OTHER'
  },

  makeEntity,
  makePerson,
  getEntityType,
  getProperty,
  getEntity;

getProperty = function(object, property, lang) {
  var matchingTriples = _.where(object.triolets, {predicat: property});
  if(!matchingTriples.length)
    return {value: null};
  debug('\t\t'+property+' : '+matchingTriples);
  if(lang) {
    var matchingLangTriples = _.where(matchingTriples, {lang: lang});
    if(matchingLangTriples.length) {
      return matchingLangTriples[0];
    }
  }
  return matchingTriples[0];
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
};

getEntity = function(object,fields) {
  var entity = {};
  _.each(fields, function(field) {
    var required = (field[2] && field[2].required ? true : false),
        property = getProperty(object,field[1],(field[2] ? field[2].lang : undefined));
    if(!property.value) {
      if(required) {
        property.value = 'N/A';
      }
    }
    else {
      entity[field[0]] = property.value;
    }
  });
  return entity;
};

makeEntity = function(object,lang) {
  var fields = [
        // key,URI,[options(required,lang)]
        ['label','http://www.w3.org/2000/01/rdf-schema#label',{required: true, lang: lang}],
        ['wikiUrl','http://xmlns.com/foaf/0.1/isPrimaryTopicOf',{required: true}],
        ['abstract','http://dbpedia.org/ontology/abstract',{required: true, lang: lang}],
        ['description','http://www.w3.org/2000/01/rdf-schema#comment',{lang: lang}],
        ['image','http://xmlns.com/foaf/0.1/depiction'],
        ['caption','http://dbpedia.org/property/imageCaption'],
        ['caption','http://dbpedia.org/property/caption'],
        ['thumbnail','http://dbpedia.org/ontology/thumbnail']
      ],
      entity = {
        type: getEntityType(object.triolets)
      };
  entity = _.extend(entity,getEntity(object,fields));
  if(!entity.description) {
    entity.description = entity.abstract.slice(0,242)+'...';
  }
  return entity;
};

makePerson = function(object,lang) {
  var fields = [
        ['description','http://purl.org/dc/elements/1.1/description',{lang: lang}]
      ],
      entity = {};
  entity = _.extend(entity,getEntity(object,fields));
  return entity;
};

router.get('/', function(req, res, next) {
  var params = req.query,
      lang = params.l || 'en',
      results = {};
  debug('requête : ' + params.q);

  progress('Search engines working...');
  //searchEngines.search(params.q, function(err, results) {
  //if (err) return next(new Error(err));
    //results.pages = ["http://wiki.verkata.com/fr/wiki/Mark_Zuckerberg","http://en.wikipedia.com/wiki/Mark_Zuckerberg"];
    results.pages = ["http://www.barrakobama.com/","https://twitter.com/barackobama","https://www.barackobama.com/","http://tinyurl.com/7362zk","https://www.facebook.com/barackobama","http://www.reuters.com/people/barack-obama","http://topics.bloomberg.com/barack-obama/","http://topics.wsj.com/person/O/barack-obama/4328","http://www.biography.com/people/barack-obama-12782369","http://www.chicagotribune.com/topic/politics/government/barack-obama-PEPLT007408-topic.html"];
    //results.pages = ['http://en.wikipedia.com/wiki/Mark_Zuckerberg'];
    debug('got table: ' + JSON.stringify(results.pages));

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

    progress('Anotating pages...');
    spotlight.getGraph({pages: results.pages, live: false, confidence: 0.3, support: 15}, function(err, graphs){
      var jsonOut = {
            "bestsList" : [],
            "subjectsList" : []
          },
          entities = [],
          regexSubDomain = new RegExp('^http\:\/\/[a-zA-Z]+\.dbpedia\.org\/.+','i');
      debug('found '+_.keys(graphs).length+' graphs');
      triImportance.explore(graphs, jsonOut);
      triImportance.bestSubjects(jsonOut, 10);

      var nbBests = jsonOut.bestsList.length,
          noIteration = 1;
      async.each(jsonOut.bestsList, function(i, nextIndice) {
        var object = jsonOut.subjectsList[i];

        progress('Analizing entity ('+(noIteration++)+'/'+nbBests+')');

        // On ignore les sous-domaines de DBpedia
        if(regexSubDomain.test(object.subject)) {
          return nextIndice();
        }
        var entityType = getEntityType(object.triolets);
        debug('found : '+object.subject);
        debug('\t'+object.triolets.length+' triolets');
        if(entityType) {
          debug(object.subject+' detected as '+entityType);
          var entity = _.extend({}, makeEntity(object, lang));
          entities.push(entity);
          return nextIndice();
        }
        else {
          async.waterfall([
            function(callback) {
              // On recherche le subject sur DBpedia
              spotlight.getDbpediaGraph(false,[object.subject], callback);
            },
            function(graph, callback) {
              debug('DBpedia : '+object.subject);
              var uri = object.subject;
              triImportance.getSubjectFromGraph(uri,graph[uri],callback);
            },
            function(subject, callback) {
              debug('\t'+subject.triolets.length+' triples found');
              var entityType = getEntityType(subject.triolets);
              if(entityType) {
                debug('\tDetected as '+entityType);
                callback(null, subject);
              }
              else {
                callback(new Error('wrong entityType'));
              }
            },
            function(subject, callback) {
              var entity = _.extend({}, makeEntity(subject, lang));
              debug('\tSuccessfully crafted');
              callback(null, entity);
            }
          ],
          function(err,entity) {
            if(!err) {
              entities.push(entity);
              debug('\tPushed');
            }
            return nextIndice();
          });// async.waterfall
        }
      },
      function(err) {
        if(!err) {
          progress('Sending response...');
          debug('sending response...');
          res.selectedLang = lang;
          res.entities = entities;
        }
        next(err);
      });
    });
  //});
});// router.get

router.get('/', function(req,res,next) {
  var params = req.query;
  debug('Lang : '+res.selectedLang);
  if (req.accepts('text/html')) {
    res.render('search', {title: 'Résultats de la requête', inputValue: params.q, selectedLang: res.selectedLang, entities: res.entities});
  } else if (req.accepts('json')) {
    res.set('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({q: params.q, entities: res.entities}));
  } else {
    res.status(406).send('Not Acceptable');
  }
});

module.exports = router;
