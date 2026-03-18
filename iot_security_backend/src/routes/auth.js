const express = require('express');
const authController = require('../controllers/authController');
const { authenticateRequest } = require('../middleware');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Creates a new standard user account and returns a JWT access token for the frontend session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error.
 *       409:
 *         description: Email already exists.
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in with email and password
 *     description: Authenticates a seeded or registered user and returns a JWT access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Authentication successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the current authenticated user
 *     description: Resolves the active user profile using the supplied Bearer JWT access token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid token.
 */
router.get('/me', authenticateRequest, authController.getMe);

module.exports = router;
