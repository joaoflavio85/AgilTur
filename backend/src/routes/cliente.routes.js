// cliente.routes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', clienteController.listar.bind(clienteController));
router.get('/:id', clienteController.buscarPorId.bind(clienteController));
router.post('/', clienteController.criar.bind(clienteController));
router.put('/:id', clienteController.atualizar.bind(clienteController));
router.delete('/:id', clienteController.excluir.bind(clienteController));

module.exports = router;
