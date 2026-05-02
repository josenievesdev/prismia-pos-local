const express = require('express');

const cotizacionesController = require('./cotizaciones.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', cotizacionesController.mostrarListadoCotizaciones);

router.get('/api/siguiente', cotizacionesController.obtenerSiguienteCotizacion);

router.get('/api/clientes/buscar', cotizacionesController.buscarClientes);
router.get('/api/productos/buscar', cotizacionesController.buscarProductos);
router.get('/api/productos/:id', cotizacionesController.obtenerProducto);

router.get('/api', cotizacionesController.listarCotizaciones);
router.get('/api/:id', cotizacionesController.obtenerDetalleCotizacion);

router.get('/nueva', cotizacionesController.mostrarNuevaCotizacion);
router.get('/:id/imprimir', cotizacionesController.mostrarImprimirCotizacion);
router.get('/:id', cotizacionesController.mostrarDetalleCotizacion);

router.post('/', cotizacionesController.crearCotizacion);
module.exports = router;