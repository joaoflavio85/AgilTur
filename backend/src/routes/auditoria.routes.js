const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoria.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', auditoriaController.listar.bind(auditoriaController));

module.exports = router;
