const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorio.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/dashboard', relatorioController.dashboard.bind(relatorioController));
router.get('/vendas-periodo', relatorioController.vendasPorPeriodo.bind(relatorioController));
router.get('/vendas-por-agente', relatorioController.vendasPorAgente.bind(relatorioController));
router.get('/contas-receber-pendentes', relatorioController.contasReceberPendentes.bind(relatorioController));
router.get('/contas-pagar-pendentes', relatorioController.contasPagarPendentes.bind(relatorioController));
router.get('/clientes-em-viagem', relatorioController.clientesEmViagem.bind(relatorioController));

module.exports = router;
