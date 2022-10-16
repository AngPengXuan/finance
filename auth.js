const passport = require('passport');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
require('dotenv').config();
const mongoose = require('mongoose');
const users = require('./models/user');

//connect mongoDB
let dbUrl = process.env.DB_URL;
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!")
    })
    .catch(err => {
        console.log("MONGO CONNECTION ERROR!")
        console.log(err)
    })

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACKURL,
    passReqToCallback: true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    //console.log(profile);
    const test = await users.findOne({email: profile.email}).exec()
    //console.log(test);
    if (test !== null)
    {
      return done(null, profile);
    }
    else
    {
      return done(null);
    }
  }
));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});