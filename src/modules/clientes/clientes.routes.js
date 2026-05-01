const express = require('express');

const clientesController = require('./clientes.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador', 'cajero'));

router.get('/', clientesController.listarClientes);

router.get('/nuevo', clientesController.mostrarCrearCliente);
router.post('/nuevo', clientesController.crearCliente);

router.post('/rapido', clientesController.crearClienteRapido);

router.get('/:id/editar', clientesController.mostrarEditarCliente);
router.post('/:id/editar', clientesController.actualizarCliente);

router.post('/:id/estado', clientesController.cambiarEstadoCliente);

module.exports = router;