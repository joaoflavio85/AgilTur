const express = require('express');
const router = express.Router();
const centroCustoController = require('../controllers/centroCusto.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', centroCustoController.listar.bind(centroCustoController));
router.get('/:id', centroCustoController.buscarPorId.bind(centroCustoController));
router.post('/', centroCustoController.criar.bind(centroCustoController));
router.put('/:id', centroCustoController.atualizar.bind(centroCustoController));
router.delete('/:id', centroCustoController.excluir.bind(centroCustoController));

module.exports = router;
