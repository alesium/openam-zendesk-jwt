var http = require('http');
var jwt = require('jwt-simple');
var uuid = require('uuid');
var express = require('express');
var passport = require('passport');

var zendesk_domain = '(zendesk name or domain)'; //alesium for alesium.zendesk.com
var shared_key = '{my zendesk token}';

var jwt_callback_url = 'https://(url to this app)/jwt/zendesk/callback';
var openam_base_url = 'https://(url to openam)/openam/';

var listen_port = 3000;

var app = express();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser('session'));
  app.use(express.session({secret: '&*(HEH#(*@!Mlkcdhloapoiuds9812'}));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session());
// Initialize Passport! Also use passport.session() middleware, to support
// persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
var OpenAmStrategy = require('passport-openam').Strategy;

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the OpenAmStrategy within Passport.
// Strategies in Passport require a `verify` function, which accept
// credentials (in this case, an accessToken, refreshToken, and Facebook
// profile), and invoke a callback with a user object.
passport.use(new OpenAmStrategy({
    callbackUrl: jwt_callback_url,
    openAmBaseUrl: openam_base_url
  },
  function(token, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's OpenAm profile is returned to
      // represent the logged-in user. In a typical application, you would want
      // to associate the OpenAm account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


app.get('/jwt/zendesk',
  passport.authenticate('openam'),
  function(req, res){
  // The request will be redirected to Openam for authentication, so this
  // function will not be called.
  if ( req.query.return_to ){
    req.session.return_to = req.query.return_to;
  }
});

app.get('/jwt/zendesk/callback',
  passport.authenticate('openam', { failureRedirect: openam_base_url }),
  function(req, res) {
    // Implement the JWT token here.
     var payload = {
           iat: (new Date().getTime() / 1000),
           jti: uuid.v4(),
           email: req.user.email,
           name: req.user.name.givenName + " " + req.user.name.familyName
     };
    var token = jwt.encode(payload, shared_key);
    console.log(payload);
    console.log(token);
    var url = 'https://'+zendesk_domain+'.zendesk.com/access/jwt?jwt='+token;
    if ( req.session.return_to ){
      url = url + '&return_to=' + req.session.return_to;
    }
    console.log(url);
    res.redirect(url);
});

app.get('/jwt/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

console.log('Starting on port '+listen_port);
app.listen(listen_port);

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
      res.redirect('/jwt/zendesk')
}


