const express = require('express');
const router = express.Router();
const operadoraController = require('../controllers/operadora.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', operadoraController.listar.bind(operadoraController));
router.get('/:id', operadoraController.buscarPorId.bind(operadoraController));
router.post('/', authorize('ADMIN'), operadoraController.criar.bind(operadoraController));
router.put('/:id', authorize('ADMIN'), operadoraController.atualizar.bind(operadoraController));
router.delete('/:id', authorize('ADMIN'), operadoraController.excluir.bind(operadoraController));

module.exports = router;
