const env = require('./env');

const empresa = {
    software: {
        nombre: env.app.name || 'Prismia POS Local',
        nombreCorto: 'Prismia',
        logoTexto: 'P',
        descripcion: 'POS local para ventas, caja, inventario, clientes, compras y reportes.',
        version: '1.0.0',
        desarrollador: 'TINAI',
        sitioWeb: '',
    },

    producto: {
        tipo: 'POS Local',
        modo: 'local',
        preparadoParaNube: true,
        ecosistema: 'TINAI',
    },

    soporte: {
        correo: '',
        telefono: '3215394234',
    },
};

module.exports = empresa;