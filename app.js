var
  // App
  express = require('express'),
  app = express(),

  // Node api
  path = require('path'),

  // Middlewares
  favicon = require('serve-favicon'),
  compression = require('compression'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser');

module.exports = app;

// Middlewares setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
app.use(require('./redis-db'));

// Routes setup
app.use('/', require('./routes/index'));
app.use('/pages', require('./routes/pages'));
app.use('/search', require('./routes/search'));

// No route worked: catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});



/* Error handlers */

// Development error handler (will print stacktrace)
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);

    if (req.accepts('text/html')) {
      res.render('alert', {
        message: err.message,
        error: err
      });
    } else if (req.accepts('json')) {
      res.set('Content-Type', 'application/json');
      res.status(err.status).send(JSON.stringify({err: err}) + '\r\n');
    }
  });
}

// Production error handler (no stacktraces leaked to user)
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('alert', {
    message: err.message,
    error: {status: err.status}
  });
});
