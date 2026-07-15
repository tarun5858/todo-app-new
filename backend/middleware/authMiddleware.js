const jwt = require('jsonwebtoken');

// runs before any proctected route. reads the token from the
// "Authorization: Bearer <token>" header, varifies it, and attaches
// the logged-in user's id to req.userId for the route to use.

function protect(req, res, next){
 const authHeader = req.headers.authorization;

 if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).json({ message: 'Not Authorized, no token'});
 }

 const token = authHeader.split(' ')[1];

 try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
 }catch(err){
    return res.status(401).json({message : "Not Authorized, token valid"})
 }
}

module.exports = protect;