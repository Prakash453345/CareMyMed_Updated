const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { checkPasswordChange } = require('../middleware/checkPasswordChange');
const { validateRequest } = require('../middleware/validateRequest');
const { registerSchema, loginSchema, changePasswordSchema, createUserSchema } = require('../validations/authSchemas');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', validateRequest(registerSchema), authController.register);

router.post('/detect-role', authController.detectRole);

router.post('/login', validateRequest(loginSchema), authController.login);

router.post('/logout', authenticate, authController.logout);

router.post('/refresh', authController.refreshToken);

router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticate, authController.getMe);

router.post('/create-user', authenticate, checkPasswordChange, validateRequest(createUserSchema), authController.createUser);

router.post('/change-password', authenticate, validateRequest(changePasswordSchema), authController.changePassword);

router.put('/me', authenticate, checkPasswordChange, authorize('profile', 'update'), authController.updateMe);

router.post('/google-login', authController.googleLogin);

router.post('/forgot-password/send-otp', authController.sendForgotPasswordOtp);

router.post('/forgot-password/verify-otp', authController.verifyForgotPasswordOtp);

router.post('/forgot-password/reset', authController.resetForgotPassword);

router.get('/google-callback', authController.googleCallback);

// ── Phone Verification Routes ──────────────────────────────────────────

router.post('/phone/send-otp', authenticate, authController.sendPhoneOtp);

router.post('/phone/verify-otp', authenticate, authController.verifyPhoneOtp);

module.exports = router;
