const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/config', whatsappController.getConfig.bind(whatsappController));
router.post('/config', whatsappController.salvarConfig.bind(whatsappController));
router.post('/enviar', whatsappController.enviar.bind(whatsappController));

module.exports = router;
