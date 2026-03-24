const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/chatbot/webhook', whatsappController.webhookChatbot.bind(whatsappController));

router.use(authMiddleware);

router.post('/chatbot/importar-contato', whatsappController.importarContatoChatbot.bind(whatsappController));
router.post('/chatbot/sincronizar-recentes', whatsappController.sincronizarConversasRecentes.bind(whatsappController));
router.post('/chatbot/enviar-mensagem', whatsappController.enviarMensagemChatbot.bind(whatsappController));
router.get('/conversas-ativas', whatsappController.listarConversasAtivas.bind(whatsappController));
router.get('/config', whatsappController.getConfig.bind(whatsappController));
router.post('/config', whatsappController.salvarConfig.bind(whatsappController));
router.post('/enviar', whatsappController.enviar.bind(whatsappController));

module.exports = router;
