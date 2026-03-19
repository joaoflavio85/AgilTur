const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', usuarioController.listar.bind(usuarioController));
router.get('/:id', usuarioController.buscarPorId.bind(usuarioController));
router.post('/', usuarioController.criar.bind(usuarioController));
router.put('/:id', usuarioController.atualizar.bind(usuarioController));
router.delete('/:id', usuarioController.desativar.bind(usuarioController));

module.exports = router;
