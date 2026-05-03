const express = require('express');
const notasCreditoController = require('./notasCredito.controller');

const router = express.Router();

router.get('/api/siguiente', notasCreditoController.obtenerSiguienteNotaCredito);
router.get('/api/resumen', notasCreditoController.obtenerResumenNotasCredito);

module.exports = router;