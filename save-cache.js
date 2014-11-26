var fs = require('fs'),
  debug = require('debug')('save-cache');

/**
 * Saves the result in a file
 * @param {string} fileName - Name of the file in which data will be stored in ./cache/
 *                 You have to define the extension
 * @param {object} result - Object that will be stored
 * @param {doneCallback} done - Function that will be called when saving is done
 */
module.exports.saveCache = function(fileName, result, done) {
  fs.writeFile('./cache/'+fileName, JSON.stringify(result), function(err) {
    if (err) debug('Error when writing cache ' + err);
    done(err);
  });
};

/**
 * Loads the result in a file
 * @param {string} fileName - Name of the file from which data will be loaded in ./cache/
 *                 You have to define the extension
 * @param {doneCallback} done - Function that will be called when loading is done
 */
module.exports.loadCache = function(fileName, done) {
  fs.readFile('./cache/'+fileName, function(err, data) {
    var result = {};
    if (err) debug('Error when loading data ' + err);
    if (data) result = JSON.parse(data);
    done(err, result);
  });
};
