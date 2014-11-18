var spotlight = require('./spotlight');

spotlight.annotate({
  text: 'Contient au moins un petit peu s\'il te plaît!'
}, function(err, graph) {
  if (err) throw err;

  console.dir(graph);
});
