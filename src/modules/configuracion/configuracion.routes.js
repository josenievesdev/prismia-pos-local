const express = require('express');
const configuracionController = require('./configuracion.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.get(
    '/',
    requiereAutenticacion,
    requiereRol('administrador'),
    configuracionController.mostrarConfiguracion
);

router.post(
    '/',
    requiereAutenticacion,
    requiereRol('administrador'),
    configuracionController.actualizarConfiguracion
);

module.exports = router;