// agenda.routes.js
const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agenda.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.get('/', agendaController.agenda.bind(agendaController));

module.exports = router;
