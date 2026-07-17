require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const path = require('path');
const authRoutes = require('./routes/authRoutes')

const app = express();

app.use(cors()); // allows your frontend (different origin) to call this API
app.use(express.json()); // parses incoming JSON request bodies
app.use('/api/auth',authRoutes);
// Mounts the auth routes under /api/auth, so register becomes reachable at POST /api/auth/register and login at POST /api/auth/login.

connectDB();


app.use("/api/tasks", taskRoutes);

app.use(express.static(path.join(__dirname,'..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
