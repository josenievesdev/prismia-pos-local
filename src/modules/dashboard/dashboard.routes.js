const express = require('express');
const dashboardController = require('./dashboard.controller');
const { requiereAutenticacion } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/', requiereAutenticacion, dashboardController.mostrarDashboard);

module.exports = router;