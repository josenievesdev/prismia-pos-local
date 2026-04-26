const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

router.get('/login', authController.mostrarLogin);
router.post('/login', authController.procesarLogin);
router.post('/logout', authController.cerrarSesion);

module.exports = router;