require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

const allowedOrigins = [
  "http://127.0.0.1:5500", // Live Server, local dev
  "http://localhost:5500",
  process.env.CLIENT_ORIGIN, // your deployed frontend URL, set in Step 6
].filter(Boolean);

app.use(cors({ origin: allowedOrigins })); // allows your frontend (different origin) to call this API
app.use(express.json()); // parses incoming JSON request bodies

connectDB();


app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.send("Todo API is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
