const express = require('express');
const router = express.Router();
const modeloPosVendaController = require('../controllers/modeloPosVenda.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/resolver', modeloPosVendaController.resolver.bind(modeloPosVendaController));
router.get('/', authorize('ADMIN'), modeloPosVendaController.listar.bind(modeloPosVendaController));
router.get('/:id', authorize('ADMIN'), modeloPosVendaController.buscarPorId.bind(modeloPosVendaController));
router.post('/', authorize('ADMIN'), modeloPosVendaController.criar.bind(modeloPosVendaController));
router.put('/:id', authorize('ADMIN'), modeloPosVendaController.atualizar.bind(modeloPosVendaController));
router.delete('/:id', authorize('ADMIN'), modeloPosVendaController.excluir.bind(modeloPosVendaController));

module.exports = router;
