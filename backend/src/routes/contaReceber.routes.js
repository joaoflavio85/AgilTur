const express = require('express');
const router = express.Router();
const contaReceberController = require('../controllers/contaReceber.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

router.post('/webhook/asaas', contaReceberController.webhookAsaas.bind(contaReceberController));

router.use(authMiddleware);
router.use(authorize('ADMIN'));

router.get('/', contaReceberController.listar.bind(contaReceberController));
router.get('/:id', contaReceberController.buscarPorId.bind(contaReceberController));
router.post('/', contaReceberController.criar.bind(contaReceberController));
router.put('/:id', contaReceberController.atualizar.bind(contaReceberController));
router.patch('/:id/pagar', contaReceberController.registrarPagamento.bind(contaReceberController));
router.post('/:id/gerar-boleto', contaReceberController.gerarBoletoAsaas.bind(contaReceberController));
router.delete('/:id', contaReceberController.excluir.bind(contaReceberController));

module.exports = router;
