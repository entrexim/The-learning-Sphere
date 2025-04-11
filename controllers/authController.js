const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('../config/db');
const sendEmail = require('../utils/sendEmail');

// Add MySQL connection (same as in server.js) to fetch courses and teachers
const mysql = require('mysql2');
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
  console.log("✅ Connected to MySQL database in authController");
});

exports.getSignup = (req, res) => {
    res.render('AuthPages/signup', { error: null });
};

exports.getLogin = (req, res) => {
    res.render('AuthPages/login', { error: null });
};

exports.getHome = async (req, res) => {
    try {
        const [courses] = await db.promise().query("SELECT * FROM courses LIMIT 6");
        const [teachers] = await db.promise().query("SELECT * FROM teachers LIMIT 6");

        res.render('InsidePages/home', {
            user: req.user,
            courses,
            teachers
        });
    } catch (err) {
        console.error("Database error in getHome:", err);
        res.status(500).send("Database error");
    }
};
exports.getAllTeachers = async (req, res) => {
    try {
        const [teachers] = await db.promise().query("SELECT * FROM teachers");
        res.render('InsidePages/allTeachers', { teachers });
    } catch (err) {
        console.error("Database error in getAllTeachers:", err);
        res.status(500).send("Database error");
    }
};

exports.getAllCourses = async (req, res) => {
    try {
        const [courses] = await db.promise().query("SELECT * FROM courses");
        res.render('InsidePages/allCourses', { courses });
    } catch (err) {
        console.error("Database error in getAllCourses:", err);
        res.status(500).send("Database error");
    }
};

exports.getCourseDetails = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10); // Ensure courseId is a number
        console.log("Fetching course with ID:", courseId);
        
        if (isNaN(courseId)) {
            return res.status(400).send("Invalid course ID");
        }

        const [course] = await db.promise().query(
            "SELECT c.id, c.course_title, c.course_description, c.course_image, c.start_date, c.fees, t.teacher_title, t.teacher_image FROM courses c JOIN teachers t ON c.teacher_id = t.id WHERE c.id = ?",
            [courseId]
        );

        if (course.length === 0) {
            return res.status(404).send("Course not found");
        }

        res.render('InsidePages/course_details', { course: course[0], user: req.user });
    } catch (error) {
        console.error("Error fetching course details:", error);
        res.status(500).send("Database error");
    }
};




exports.getVerifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE verification_token = ?',
            [token]
        );

        const user = rows[0];
        if (!user) {
            return res.render('AuthPages/signup', { error: 'Invalid or expired verification token' });
        }

        await pool.query(
            'UPDATE users SET verified = TRUE, verification_token = NULL WHERE id = ?',
            [user.id]
        );

        res.render('AuthPages/login', { error: 'Email verified successfully! Please log in.' });
    } catch (error) {
        console.error('Verify email error:', error);
        res.render('AuthPages/signup', { error: 'Error verifying email' });
    }
};

exports.getResendVerification = (req, res) => {
    res.render('AuthPages/resend-verification', { error: null });
};

exports.postSignup = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, verification_token, verified) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, verificationToken, false]
        );

        const verificationLink = `http://localhost:${process.env.PORT || 3000}/verify-email?token=${verificationToken}`;
        await sendEmail(
            email,
            'Verify Your Email',
            `Please click this link to verify your email: ${verificationLink}`
        );

        res.render('AuthPages/signup', { error: 'Signup successful! Please check your email to verify your account.' });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.render('AuthPages/signup', { error: 'Email already exists. Please use a different email.' });
        } else {
            res.render('AuthPages/signup', { error: 'Error creating user. Please try again later.' });
        }
    }
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        const user = rows[0];
        if (!user) {
            return res.render('AuthPages/login', { error: 'Invalid email or password' });
        }
        if (!user.verified) {
            return res.render('AuthPages/login', { error: 'Please verify your email before logging in' });
        }
        if (!await bcrypt.compare(password, user.password)) {
            return res.render('AuthPages/login', { error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, { httpOnly: true });
        res.redirect('/home');
    } catch (error) {
        console.error('Login error:', error);
        res.render('AuthPages/login', { error: 'Login error' });
    }
};

exports.postResendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        const user = rows[0];
        if (!user) {
            return res.render('AuthPages/resend-verification', { error: 'Email not found' });
        }
        if (user.verified) {
            return res.render('AuthPages/resend-verification', { error: 'Email is already verified' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        await pool.query(
            'UPDATE users SET verification_token = ? WHERE email = ? ',
            [verificationToken, email]
        );

        const verificationLink = `http://localhost:${process.env.PORT || 3000}/verify-email?token=${verificationToken}`;
        await sendEmail(
            email,
            'Verify Your Email',
            `Please click this link to verify your email: ${verificationLink}`
        );

        res.render('AuthPages/resend-verification', { error: 'Verification email resent! Please check your email.' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.render('AuthPages/resend-verification', { error: 'Error resending verification email' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
};