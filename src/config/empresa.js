const env = require('./env');

const empresa = {
    software: {
        nombre: env.app.name || 'Prismia POS Local',
        nombreCorto: 'Prismia',
        logoTexto: 'P',
        descripcion: 'POS local para ventas, caja, inventario y reportes.',
        version: '0.1.0',
        desarrollador: 'Nieves Systems',
        sitioWeb: '',
    },

    producto: {
        tipo: 'POS Local',
        modo: 'local',
        preparadoParaNube: true,
    },

    soporte: {
        correo: '',
        telefono: '',
    },
};

module.exports = empresa;