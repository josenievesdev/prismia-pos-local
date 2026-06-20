const express = require('express');
const licenciaLocalController = require('./licenciaLocal.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');
const { requiereRol } = require('../../middlewares/role.middleware');

const router = express.Router();

router.get(
    '/',
    requiereAutenticacion,
    licenciaLocalController.mostrarEstadoLicencia
);

router.get(
    '/activar',
    requiereAutenticacion,
    licenciaLocalController.mostrarActivacion
);

router.post(
    '/activar',
    requiereAutenticacion,
    requiereRol('administrador'),
    licenciaLocalController.procesarActivacion
);

module.exports = router;