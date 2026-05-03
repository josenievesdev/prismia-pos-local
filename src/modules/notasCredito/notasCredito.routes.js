const express = require('express');

const notasCreditoController = require('./notasCredito.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', notasCreditoController.mostrarListadoNotasCredito);

router.get('/api/siguiente', notasCreditoController.obtenerSiguienteNotaCredito);
router.get('/api/resumen', notasCreditoController.obtenerResumenNotasCredito);
router.get('/api', notasCreditoController.listarNotasCredito);
router.get('/api/:id', notasCreditoController.obtenerDetalleNotaCredito);

router.get('/:id/imprimir', notasCreditoController.mostrarImprimirNotaCredito);
router.get('/:id', notasCreditoController.mostrarDetalleNotaCredito);

module.exports = router;