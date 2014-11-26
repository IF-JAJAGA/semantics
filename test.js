var
  app = require('express')(),
  save = require('./save-cache'),
  other;

module.exports = app;

other = require('./other');

console.log('programme lancé');

process.on('SIGINT', function() {
  console.log('choppé signal');
  save.saveCache('test.json', other.test, function(err) {
    if (err) console.log(err);
    console.log('fini d\'écrire\n');
    process.exit();
  });
});

setTimeout(function() {
  console.log('trop tard!!');
}, 200000);


app.listen(process.env.PORT || 3000);
