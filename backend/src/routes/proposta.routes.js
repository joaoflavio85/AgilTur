const express = require('express');
const router = express.Router();
const propostaController = require('../controllers/proposta.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', propostaController.listar.bind(propostaController));
router.get('/funil', propostaController.funil.bind(propostaController));
router.get('/motivos-perda', propostaController.listarMotivosPerda.bind(propostaController));
router.post('/motivos-perda', propostaController.cadastrarMotivoPerda.bind(propostaController));
router.get('/:id', propostaController.buscarPorId.bind(propostaController));
router.post('/', propostaController.criar.bind(propostaController));
router.put('/:id', propostaController.atualizar.bind(propostaController));
router.delete('/:id', propostaController.excluir.bind(propostaController));
router.patch('/:id/fechar', propostaController.fechar.bind(propostaController));
router.patch('/:id/perder', propostaController.perder.bind(propostaController));

module.exports = router;
