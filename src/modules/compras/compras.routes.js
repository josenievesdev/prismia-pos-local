const express = require('express');

const comprasController = require('./compras.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/cuentas-por-pagar', comprasController.mostrarCuentasPorPagar);
router.get('/nueva', comprasController.mostrarFormularioNuevaCompra);
router.get('/api/productos/buscar', comprasController.buscarProductosParaCompra);
router.post('/api/validar', comprasController.validarCompra);

router.post('/', comprasController.guardarCompra);
router.get('/', comprasController.listarCompras);
router.get('/:id/imprimir', comprasController.mostrarImprimirCompra);
router.get('/:id', comprasController.mostrarDetalleCompra);

module.exports = router;