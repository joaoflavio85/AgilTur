const express = require('express');
const router = express.Router();
const contaPagarController = require('../controllers/contaPagar.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', contaPagarController.listar.bind(contaPagarController));
router.get('/:id', contaPagarController.buscarPorId.bind(contaPagarController));
router.post('/', contaPagarController.criar.bind(contaPagarController));
router.put('/:id', contaPagarController.atualizar.bind(contaPagarController));
router.patch('/:id/pagar', contaPagarController.registrarPagamento.bind(contaPagarController));
router.delete('/:id', contaPagarController.excluir.bind(contaPagarController));

module.exports = router;
