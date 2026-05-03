const express = require('express');

const remisionesController = require('./remisiones.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', remisionesController.mostrarListadoRemisiones);

router.get('/api/siguiente', remisionesController.obtenerSiguienteRemision);

router.get('/api/clientes/buscar', remisionesController.buscarClientes);
router.get('/api/productos/buscar', remisionesController.buscarProductos);
router.get('/api/productos/:id', remisionesController.obtenerProducto);

router.get('/api', remisionesController.listarRemisiones);
router.get('/api/:id', remisionesController.obtenerDetalleRemision);

router.get('/nueva', remisionesController.mostrarNuevaRemision);
router.get('/:id/convertir/preparar', remisionesController.prepararConversionRemision);
router.post('/:id/convertir', remisionesController.convertirRemisionAVenta);
router.get('/:id/imprimir', remisionesController.mostrarImprimirRemision);
router.get('/:id', remisionesController.mostrarDetalleRemision);

router.post('/', remisionesController.crearRemision);

module.exports = router;