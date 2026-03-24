// cliente.routes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', clienteController.listar.bind(clienteController));
router.get('/indicacoes/ranking', clienteController.rankingIndicacoes.bind(clienteController));
router.patch('/indicacoes/:indicacaoId/pagar-bonificacao', clienteController.marcarBonificacaoPaga.bind(clienteController));
router.patch('/indicacoes/:indicacaoId/desfazer-bonificacao', clienteController.desfazerBonificacaoPaga.bind(clienteController));
router.get('/:id/indicacoes', clienteController.listarIndicacoes.bind(clienteController));
router.get('/:id', clienteController.buscarPorId.bind(clienteController));
router.post('/', clienteController.criar.bind(clienteController));
router.put('/:id', clienteController.atualizar.bind(clienteController));
router.delete('/:id', clienteController.excluir.bind(clienteController));

module.exports = router;
