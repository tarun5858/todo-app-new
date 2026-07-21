const express = require('express');
const router = express.Router();
const {register, login, googleLogin} = require('../controllers/authControllers');

router.post('/google', googleLogin);
router.post('/register', register);
router.post('/login',login);

module.exports = router;
// Maps POST /register and POST /login to their respective controller functions. Note there's no protect middleware here — registering/logging in has to be accessible without already having a token (that would be a chicken-and-egg problem).