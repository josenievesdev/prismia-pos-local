const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

// El límite de intentos fallidos (5 por cuenta y 20 por equipo cada 15 minutos)
// vive en auth.controller.js (utils/limitador-intentos), con sus pruebas en
// tests/seguridad.test.js. No se repite aquí para no contar dos veces cada fallo.
router.get('/login', authController.mostrarLogin);
router.post('/login', authController.procesarLogin);
router.post('/logout', authController.cerrarSesion);

module.exports = router;
