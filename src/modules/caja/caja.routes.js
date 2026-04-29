const express = require('express');

const cajaController = require('./caja.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', cajaController.mostrarCaja);

router.get('/abrir', cajaController.mostrarFormularioAbrir);
router.post('/abrir', cajaController.abrirCaja);

router.get('/movimiento', cajaController.mostrarFormularioMovimiento);
router.post('/movimiento', cajaController.registrarMovimientoManual);

router.get('/gasto', cajaController.mostrarFormularioGasto);
router.post('/gasto', cajaController.registrarGastoDesdeCaja);

module.exports = router;