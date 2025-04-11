const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Root route renders F1.hbs
router.get('/', (req, res) => res.render('AuthPages/F1'));
console.log('Rendering F1.hbs');

// Authentication routes
router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/verify-email', authController.getVerifyEmail);
router.get('/resend-verification', authController.getResendVerification);
router.post('/resend-verification', authController.postResendVerification);
router.get('/logout', authController.logout);

// Protected routes
router.get('/home', protect, authController.getHome);
router.get('/aboutus', protect, (req, res) => res.render('InsidePages/aboutUs'));
router.get('/allteachers', protect, authController.getAllTeachers);
router.get('/allcourses', protect, authController.getAllCourses);

// Course details
router.get('/course/:id', protect, authController.getCourseDetails);

module.exports = router;