const express = require('express');
const productosController = require('./productos.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'inventario'));

router.get('/', productosController.listarProductos);

router.get('/nuevo', productosController.mostrarFormularioCrear);
router.post('/nuevo', productosController.crearProducto);

router.get('/:id/editar', productosController.mostrarFormularioEditar);
router.post('/:id/editar', productosController.actualizarProducto);

router.post('/:id/activar', productosController.activarProducto);
router.post('/:id/desactivar', productosController.desactivarProducto);

module.exports = router;