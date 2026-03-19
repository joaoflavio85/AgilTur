const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/login', authController.login.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));
router.get('/tenant', authController.tenant.bind(authController));

module.exports = router;
