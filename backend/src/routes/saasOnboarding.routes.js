const express = require('express');
const router = express.Router();
const saasOnboardingController = require('../controllers/saasOnboarding.controller');

router.post('/tenants', saasOnboardingController.criarTenant.bind(saasOnboardingController));

module.exports = router;
