const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const cookieParser = require("cookie-parser");
const hbs = require("hbs");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const { connectDB } = require("./config/db");
const { protect } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Set Handlebars as the view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Register Handlebars Partials
hbs.registerPartials(path.join(__dirname, "views", "InsidePages", "partials"));

// Register Handlebars Helpers
hbs.registerHelper("eq", function (a, b) {
  return a === b;
});

// MySQL Database Connection
const db = mysql.createConnection({
 host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: "courses",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL database for Courses and Teachers");
});

// Authentication Routes (including root route)
app.use("/", authRoutes);

// Protected Routes (Require login)
app.get("/allCourses", protect, (req, res) => {
  db.query("SELECT * FROM courses", (err, results) => {
    if (err) {
      console.error("Error fetching courses:", err);
      return res.status(500).send("Database error");
    }

    
    console.log("Fetched courses:", results);
    res.render("InsidePages/allCourses", { courses: results });
    console.log("Courses are fetched");
  });
});

app.get("/allTeachers", protect, (req, res) => {
  db.query("SELECT * FROM teachers", (err, results) => {
    if (err) {
      console.error("Error fetching teachers:", err);
      return res.status(500).send("Database error");
    }
    console.log("Fetched teachers:", results);
    res.render("InsidePages/allTeachers", { teachers: results });
  });
});

app.get("/aboutus", protect, (req, res) => {
  res.render("InsidePages/aboutUs");
});
app.get("/terms", (req, res) => {
  res.render("outsidePages/term_of_service");
});
app.get("/privacy", (req, res) => {
  res.render("outsidePages/privacy_policy");
});
app.get("/contact", (req, res) => {
  res.render("outsidePages/contact_us");
});



// Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

