const express = require('express');
const router = express.Router();
const brindeController = require('../controllers/brinde.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', brindeController.listar.bind(brindeController));
router.get('/movimentacoes', brindeController.movimentacoes.bind(brindeController));
router.post('/', brindeController.criar.bind(brindeController));
router.post('/entrada', brindeController.entrada.bind(brindeController));
router.post('/saida', brindeController.saida.bind(brindeController));

module.exports = router;
