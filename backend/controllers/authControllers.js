const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {OAuth2Client} =  require('google-auth-library')
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body; // the ID token sent from the frontend

    // Verifies the token was genuinely issued by Google for YOUR app
    // (checks signature, expiry, and that the audience matches your Client ID).
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload(); // { email, name, sub, ... }

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      // First time this Google account has signed in — create a new user.
      // No password is set; googleId links this account to Google going forward.
      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub
      });
    } else if (!user.googleId) {
      // An account with this email already exists (e.g. they registered with
      // a password earlier) — link the Google account to it instead of erroring.
      user.googleId = payload.sub;
      await user.save();
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id) // same JWT system as normal login
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ message: 'Google sign-in failed' });
  }
};


function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    // Pulls the three fields out of the request body. If any is missing, reject with 400 Bad Request before touching the database.


    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    // Checks if that email already has an account. Prevents duplicate signups with a clear error instead of a confusing database crash (since email is set as unique in the schema, an unhandled duplicate would otherwise throw a raw Mongo error).


    const user = await User.create({ name, email, password });
    // Creates the user document. This triggers the pre('save') hook from User.js automatically — the plain password gets hashed right here, invisibly, before it's written to MongoDB.

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
    // 201 = "Created". Sends back the new user's basic info plus a fresh JWT — so the frontend can immediately log them in without a separate login step right after registering.
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: err.message });
  }
  // Catches anything unexpected (DB connection issues, validation errors, etc.), logs the real error server-side for debugging, and sends a generic 500 to the client.
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    // Looks up the user by email. If none exists, reject. Note: the message says "Invalid email or password" rather than "no such email" — this is intentional; it doesn't reveal to an attacker whether an email is registered or not.

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });
    // Uses the comparePassword method we defined on the schema to check the typed password against the stored hash. Same generic error message either way.

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};
//   Same shape as register's success response — sends back user info + a fresh token.