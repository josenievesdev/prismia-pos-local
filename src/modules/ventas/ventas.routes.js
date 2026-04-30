const express = require('express');

const ventasController = require('./ventas.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', ventasController.mostrarPOS);
router.post('/', ventasController.registrarVenta);

router.get('/historial', ventasController.mostrarHistorial);
router.get('/:id/ticket', ventasController.imprimirTicket);

router.get('/productos/buscar', ventasController.buscarProductos);
router.get('/clientes/buscar', ventasController.buscarClientes);
router.get('/productos/:id', ventasController.obtenerProducto);

module.exports = router;