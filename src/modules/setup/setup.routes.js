const express = require('express');
const setupController = require('./setup.controller');

const router = express.Router();

router.get('/', setupController.mostrarSetup);
router.post('/', setupController.procesarSetup);

module.exports = router;