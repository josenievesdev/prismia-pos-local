const express = require('express');

const meserosController = require('./meseros.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion);
router.use(requiereRol('administrador'));

router.get('/', meserosController.listarMeseros);
router.post('/', meserosController.crearMesero);
router.post('/porcentaje', meserosController.guardarPorcentaje);
router.post('/:id/activar', meserosController.activarMesero);
router.post('/:id/desactivar', meserosController.desactivarMesero);

module.exports = router;
