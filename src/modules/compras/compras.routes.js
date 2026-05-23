const express = require('express');

const comprasController = require('./compras.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/cuentas-por-pagar', comprasController.mostrarCuentasPorPagar);
router.get('/pagos-proveedores', comprasController.mostrarPagosProveedores);
router.get('/nueva', comprasController.mostrarFormularioNuevaCompra);

// Alias defensivo para evitar que /compras/formulario sea interpretado como /compras/:id
router.get('/formulario', (req, res) => {
    return res.redirect('/compras/nueva');
});

router.get('/api/productos/buscar', comprasController.buscarProductosParaCompra);
router.post('/api/validar', comprasController.validarCompra);

router.post('/', comprasController.guardarCompra);
router.get('/', comprasController.listarCompras);

router.get('/:id(\\d+)/pagos/nuevo', comprasController.mostrarFormularioPagoProveedor);
router.post('/:id(\\d+)/pagos', comprasController.registrarPagoProveedor);
router.post('/:id(\\d+)/pagos/:idPago(\\d+)/anular', comprasController.anularPagoProveedor);

router.get('/:id(\\d+)/imprimir', comprasController.mostrarImprimirCompra);
router.get('/:id(\\d+)', comprasController.mostrarDetalleCompra);

module.exports = router;