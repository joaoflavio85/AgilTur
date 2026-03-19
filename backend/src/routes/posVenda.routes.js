const express = require('express');
const router = express.Router();
const posVendaController = require('../controllers/posVenda.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', posVendaController.listar.bind(posVendaController));
router.get('/:id', posVendaController.buscarPorId.bind(posVendaController));
router.post('/', posVendaController.criar.bind(posVendaController));
router.put('/:id', posVendaController.atualizar.bind(posVendaController));
router.delete('/:id', posVendaController.excluir.bind(posVendaController));

module.exports = router;
