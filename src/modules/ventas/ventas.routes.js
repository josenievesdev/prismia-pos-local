const express = require('express');

const ventasController = require('./ventas.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', ventasController.mostrarPOS);
router.post('/', ventasController.registrarVenta);

router.get('/movil', ventasController.mostrarPOSMovil);
router.get('/historial', ventasController.mostrarHistorial);

router.get('/productos/buscar', ventasController.buscarProductos);
router.get('/clientes/buscar', ventasController.buscarClientes);

router.post('/pos-tactil/acceso-rapido', ventasController.configurarAccesoRapidoPosTactil);
router.post('/pos-tactil/acceso-rapido/quitar', ventasController.quitarAccesoRapidoPosTactil);
router.post('/pos-tactil/acceso-rapido/mover', ventasController.moverAccesoRapidoPosTactil);

router.get('/productos/:id', ventasController.obtenerProducto);

router.get('/:id/anular/preparar', ventasController.prepararAnulacionVenta);
router.post('/:id/anular', ventasController.anularVentaCompleta);
router.get('/:id/ticket', ventasController.imprimirTicket);
router.get('/:id', ventasController.mostrarDetalleVenta);

module.exports = router;