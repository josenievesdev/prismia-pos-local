const catalogosService = require('./catalogos.service');

function buscarDepartamentos(req, res) {
    const resultado = catalogosService.buscarDepartamentos({
        query: req.query || {},
    });

    return res.json(resultado);
}

function buscarMunicipios(req, res) {
    const resultado = catalogosService.buscarMunicipios({
        query: req.query || {},
    });

    return res.json(resultado);
}

function obtenerMunicipio(req, res) {
    const resultado = catalogosService.obtenerMunicipioPorCodigo(
        req.params.codigo
    );

    const codigoEstado = resultado.ok ? 200 : 404;

    return res.status(codigoEstado).json(resultado);
}

module.exports = {
    buscarDepartamentos,
    buscarMunicipios,
    obtenerMunicipio,
};