var spotlight = require('./spotlight');

spotlight.annotate({
  text: 'Napoléon Ier, né le 15 août 1769 à Ajaccio, et mort le 5 mai 1821 sur l\'île Sainte-Hélène, est le premier empereur des Français, du 18 mai 1804 au 6 avril 1814 et du 20 mars 1815.'
}, function(err, graph) {
  if (err) throw err;

  console.log('ok');
});
