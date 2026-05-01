const catalogosRepository = require('./catalogos.repository');

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarLimite(valor, defecto = 12) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return defecto;
    }

    return Math.min(numero, 25);
}

function prepararDepartamento(departamento) {
    if (!departamento) {
        return null;
    }

    const nombreDepartamento = limpiarTexto(departamento.nombre_departamento);

    return {
        codigo_departamento: limpiarTexto(departamento.codigo_departamento),
        nombre_departamento: nombreDepartamento,
        pais: 'Colombia',
        codigo_pais: 'CO',
        etiqueta: nombreDepartamento,
    };
}

function prepararMunicipio(municipio) {
    if (!municipio) {
        return null;
    }

    const nombreMunicipio = limpiarTexto(municipio.nombre_municipio);
    const nombreDepartamento = limpiarTexto(municipio.nombre_departamento);

    return {
        codigo_municipio: limpiarTexto(municipio.codigo_municipio),
        nombre_municipio: nombreMunicipio,
        codigo_departamento: limpiarTexto(municipio.codigo_departamento),
        nombre_departamento: nombreDepartamento,
        pais: 'Colombia',
        codigo_pais: 'CO',
        etiqueta: `${nombreMunicipio}, ${nombreDepartamento}`,
    };
}

function buscarDepartamentos({ query = {} } = {}) {
    const busqueda = limpiarTexto(query.busqueda);
    const limite = normalizarLimite(query.limite);

    if (busqueda.length < 2) {
        return {
            ok: true,
            departamentos: [],
        };
    }

    const departamentos = catalogosRepository
        .buscarDepartamentos({
            busqueda,
            limite,
        })
        .map(prepararDepartamento);

    return {
        ok: true,
        departamentos,
    };
}

function buscarMunicipios({ query = {} } = {}) {
    const busqueda = limpiarTexto(query.busqueda);
    const codigoDepartamento = limpiarTexto(query.codigo_departamento);
    const limite = normalizarLimite(query.limite);

    if (!codigoDepartamento) {
        return {
            ok: true,
            municipios: [],
            mensaje: 'Selecciona primero un departamento.',
        };
    }

    if (busqueda.length < 1) {
        return {
            ok: true,
            municipios: catalogosRepository
                .buscarMunicipios({
                    busqueda: '',
                    codigo_departamento: codigoDepartamento,
                    limite,
                })
                .map(prepararMunicipio),
        };
    }

    const municipios = catalogosRepository
        .buscarMunicipios({
            busqueda,
            codigo_departamento: codigoDepartamento,
            limite,
        })
        .map(prepararMunicipio);

    return {
        ok: true,
        municipios,
    };
}

function obtenerMunicipioPorCodigo(codigoMunicipio) {
    const codigo = limpiarTexto(codigoMunicipio);

    if (!codigo) {
        return {
            ok: false,
            mensaje: 'Código de municipio no válido.',
        };
    }

    const municipio = prepararMunicipio(
        catalogosRepository.obtenerMunicipioPorCodigo(codigo)
    );

    if (!municipio) {
        return {
            ok: false,
            mensaje: 'No se encontró el municipio solicitado.',
        };
    }

    return {
        ok: true,
        municipio,
    };
}

module.exports = {
    buscarDepartamentos,
    buscarMunicipios,
    obtenerMunicipioPorCodigo,
};