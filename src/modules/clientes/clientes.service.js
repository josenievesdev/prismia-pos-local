const clientesRepository = require('./clientes.repository');

const TIPOS_CLIENTE = [
    'persona_natural',
    'persona_juridica',
];

const TIPOS_DOCUMENTO = [
    'CC',
    'CE',
    'NIT',
    'TI',
    'PP',
    'RC',
    'NUIP',
];

const ESTADOS = ['activo', 'inactivo'];

const REGIMENES_FISCALES = [
    'no_definido',
    'responsable_iva',
    'no_responsable_iva',
    'regimen_simple',
    'gran_contribuyente',
];

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function normalizarEntero(valor, defecto = 0) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return defecto;
    }

    return Math.trunc(numero);
}

function normalizarId(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function normalizarBooleano(valor, defecto = 0) {
    if (valor === undefined || valor === null || valor === '') {
        return defecto;
    }

    const texto = limpiarTexto(valor).toLowerCase();

    return ['1', 'true', 'on', 'si', 'sí'].includes(texto) ? 1 : 0;
}

function normalizarPagina(valor) {
    const pagina = Number.parseInt(valor, 10);

    if (!Number.isInteger(pagina) || pagina < 1) {
        return 1;
    }

    return pagina;
}

function normalizarLimite(valor) {
    const limite = Number.parseInt(valor, 10);
    const permitidos = [25, 50, 100];

    return permitidos.includes(limite) ? limite : 25;
}

function esCorreoValido(correo) {
    if (!correo) {
        return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function prepararCliente(cliente) {
    if (!cliente) {
        return null;
    }

    const tipoDocumento = limpiarTexto(cliente.tipo_documento) || 'CC';
    const documento = limpiarTexto(cliente.documento);
    const nombre = limpiarTexto(cliente.nombre);

    return {
        ...cliente,
        id_cliente: Number(cliente.id_cliente || 0),
        tipo_cliente: limpiarTexto(cliente.tipo_cliente) || 'persona_natural',
        tipo_documento: tipoDocumento,
        documento,
        digito_verificacion: limpiarTexto(cliente.digito_verificacion),
        nombre,
        razon_social: limpiarTexto(cliente.razon_social),
        nombre_comercial: limpiarTexto(cliente.nombre_comercial),
        telefono: limpiarTexto(cliente.telefono),
        celular: limpiarTexto(cliente.celular),
        correo: limpiarTexto(cliente.correo),
        correo_facturacion: limpiarTexto(cliente.correo_facturacion),
        direccion: limpiarTexto(cliente.direccion),
        pais: limpiarTexto(cliente.pais) || 'Colombia',
        codigo_pais: limpiarTexto(cliente.codigo_pais) || 'CO',
        departamento: limpiarTexto(cliente.departamento),
        municipio: limpiarTexto(cliente.municipio),
        regimen_fiscal: limpiarTexto(cliente.regimen_fiscal) || 'no_definido',
        obligado_facturar: normalizarEntero(cliente.obligado_facturar),
        acepta_factura_electronica: normalizarEntero(cliente.acepta_factura_electronica, 1),
        autoriza_tratamiento_datos: normalizarEntero(cliente.autoriza_tratamiento_datos),
        es_consumidor_final: normalizarEntero(cliente.es_consumidor_final),
        estado: limpiarTexto(cliente.estado) || 'activo',
        etiqueta_documento: documento ? `${tipoDocumento} ${documento}` : 'Sin documento',
        nombre_mostrar:
            limpiarTexto(cliente.razon_social)
            || limpiarTexto(cliente.nombre_comercial)
            || nombre
            || `Cliente #${cliente.id_cliente}`,
    };
}

function prepararFiltros(query = {}) {
    const pagina = normalizarPagina(query.pagina);
    const limite = normalizarLimite(query.limite);

    const estado = ESTADOS.includes(limpiarTexto(query.estado))
        ? limpiarTexto(query.estado)
        : '';

    const tipoCliente = [...TIPOS_CLIENTE, 'consumidor_final'].includes(limpiarTexto(query.tipo_cliente))
        ? limpiarTexto(query.tipo_cliente)
        : '';

    const tipoDocumento = TIPOS_DOCUMENTO.includes(limpiarTexto(query.tipo_documento))
        ? limpiarTexto(query.tipo_documento)
        : '';

    return {
        busqueda: limpiarTexto(query.busqueda),
        estado,
        tipo_cliente: tipoCliente,
        tipo_documento: tipoDocumento,
        pagina,
        limite,
        offset: (pagina - 1) * limite,
    };
}

function obtenerListadoClientes({ query = {} } = {}) {
    const filtros = prepararFiltros(query);
    const totalResultados = clientesRepository.contarClientes(filtros);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / filtros.limite));

    if (filtros.pagina > totalPaginas) {
        filtros.pagina = totalPaginas;
        filtros.offset = (filtros.pagina - 1) * filtros.limite;
    }

    const clientes = clientesRepository
        .listarClientes(filtros)
        .map(prepararCliente);

    return {
        filtros,
        clientes,
        total_resultados: totalResultados,
        limite_resultados: filtros.limite,
        pagina_actual: filtros.pagina,
        total_paginas: totalPaginas,
        tiene_pagina_anterior: filtros.pagina > 1,
        tiene_pagina_siguiente: filtros.pagina < totalPaginas,
        pagina_anterior: filtros.pagina > 1 ? filtros.pagina - 1 : 1,
        pagina_siguiente: filtros.pagina < totalPaginas ? filtros.pagina + 1 : totalPaginas,
        catalogos: obtenerCatalogosFormulario(),
    };
}

function obtenerCatalogosFormulario() {
    return {
        tipos_cliente: [
            { valor: 'persona_natural', texto: 'Persona natural' },
            { valor: 'persona_juridica', texto: 'Persona jurídica' },
        ],
        tipos_documento: [
            { valor: 'CC', texto: 'Cédula de ciudadanía' },
            { valor: 'CE', texto: 'Cédula de extranjería' },
            { valor: 'NIT', texto: 'NIT' },
            { valor: 'TI', texto: 'Tarjeta de identidad' },
            { valor: 'PP', texto: 'Pasaporte' },
            { valor: 'RC', texto: 'Registro civil' },
            { valor: 'NUIP', texto: 'NUIP' },
        ],
        regimenes_fiscales: [
            { valor: 'no_definido', texto: 'No definido' },
            { valor: 'responsable_iva', texto: 'Responsable de IVA' },
            { valor: 'no_responsable_iva', texto: 'No responsable de IVA' },
            { valor: 'regimen_simple', texto: 'Régimen simple' },
            { valor: 'gran_contribuyente', texto: 'Gran contribuyente' },
        ],
    };
}

function obtenerClienteParaFormulario(idCliente) {
    const id = normalizarId(idCliente);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Cliente no válido.',
        };
    }

    const cliente = clientesRepository.obtenerClientePorId(id);

    if (!cliente) {
        return {
            ok: false,
            mensaje: 'No se encontró el cliente solicitado.',
        };
    }

    return {
        ok: true,
        cliente: prepararCliente(cliente),
        catalogos: obtenerCatalogosFormulario(),
    };
}

function normalizarPayloadCliente(payload = {}) {
    const tipoCliente = TIPOS_CLIENTE.includes(limpiarTexto(payload.tipo_cliente))
        ? limpiarTexto(payload.tipo_cliente)
        : 'persona_natural';

    const tipoDocumento = TIPOS_DOCUMENTO.includes(limpiarTexto(payload.tipo_documento))
        ? limpiarTexto(payload.tipo_documento)
        : 'CC';

    const documento = limpiarTexto(payload.documento).replace(/\s+/g, '');
    const digitoVerificacion = limpiarTexto(payload.digito_verificacion);

    const primerNombre = limpiarTexto(payload.primer_nombre);
    const segundoNombre = limpiarTexto(payload.segundo_nombre);
    const primerApellido = limpiarTexto(payload.primer_apellido);
    const segundoApellido = limpiarTexto(payload.segundo_apellido);

    const razonSocial = limpiarTexto(payload.razon_social);
    const nombreComercial = limpiarTexto(payload.nombre_comercial);

    const nombreCalculado = tipoCliente === 'persona_juridica'
        ? (razonSocial || nombreComercial)
        : [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(' ');

    const correo = limpiarTexto(payload.correo).toLowerCase();
    const correoFacturacion = limpiarTexto(payload.correo_facturacion || correo).toLowerCase();

    const regimenFiscal = REGIMENES_FISCALES.includes(limpiarTexto(payload.regimen_fiscal))
        ? limpiarTexto(payload.regimen_fiscal)
        : 'no_definido';

    return {
        tipo_cliente: tipoCliente,
        tipo_documento: tipoCliente === 'persona_juridica' ? 'NIT' : tipoDocumento,
        documento,
        digito_verificacion: tipoCliente === 'persona_juridica' ? digitoVerificacion : '',
        nombre: nombreCalculado,
        razon_social: tipoCliente === 'persona_juridica' ? razonSocial : '',
        nombre_comercial: nombreComercial,
        primer_nombre: tipoCliente === 'persona_natural' ? primerNombre : '',
        segundo_nombre: tipoCliente === 'persona_natural' ? segundoNombre : '',
        primer_apellido: tipoCliente === 'persona_natural' ? primerApellido : '',
        segundo_apellido: tipoCliente === 'persona_natural' ? segundoApellido : '',
        telefono: limpiarTexto(payload.telefono),
        celular: limpiarTexto(payload.celular),
        correo,
        correo_facturacion: correoFacturacion,
        direccion: limpiarTexto(payload.direccion),
        pais: limpiarTexto(payload.pais) || 'Colombia',
        codigo_pais: limpiarTexto(payload.codigo_pais) || 'CO',
        departamento: limpiarTexto(payload.departamento),
        codigo_departamento: limpiarTexto(payload.codigo_departamento),
        municipio: limpiarTexto(payload.municipio),
        codigo_municipio: limpiarTexto(payload.codigo_municipio),
        barrio: limpiarTexto(payload.barrio),
        codigo_postal: limpiarTexto(payload.codigo_postal),
        regimen_fiscal: regimenFiscal,
        responsabilidades_fiscales_json: limpiarTexto(payload.responsabilidades_fiscales_json),
        obligado_facturar: normalizarBooleano(payload.obligado_facturar),
        acepta_factura_electronica: normalizarBooleano(payload.acepta_factura_electronica, 1),
        autoriza_tratamiento_datos: normalizarBooleano(payload.autoriza_tratamiento_datos),
        contacto_nombre: limpiarTexto(payload.contacto_nombre),
        contacto_cargo: limpiarTexto(payload.contacto_cargo),
        observaciones: limpiarTexto(payload.observaciones),
        observaciones_facturacion: limpiarTexto(payload.observaciones_facturacion),
    };
}

function validarCliente(datos, idCliente = null) {
    if (!datos.tipo_cliente) {
        return 'Selecciona el tipo de cliente.';
    }

    if (!datos.tipo_documento) {
        return 'Selecciona el tipo de documento.';
    }

    if (!datos.documento) {
        return 'Digita el número de documento.';
    }

    const esPersonaJuridica = datos.tipo_cliente === 'persona_juridica';
    const esNit = datos.tipo_documento === 'NIT';

    if ((esPersonaJuridica || esNit) && !datos.digito_verificacion) {
        return 'Digita el dígito de verificación del NIT.';
    }

    if (esPersonaJuridica) {
        if (!datos.razon_social && !datos.nombre_comercial) {
            return 'Digita la razón social o el nombre comercial.';
        }
    } else {
        if (!datos.primer_nombre) {
            return 'Digita el primer nombre del cliente.';
        }

        if (!datos.primer_apellido) {
            return 'Digita el primer apellido del cliente.';
        }
    }

    if (!datos.nombre) {
        return esPersonaJuridica
            ? 'Digita la razón social o el nombre comercial.'
            : 'Digita al menos nombre y apellido del cliente.';
    }

    if (datos.correo && !esCorreoValido(datos.correo)) {
        return 'El correo principal no tiene un formato válido.';
    }

    if (datos.correo_facturacion && !esCorreoValido(datos.correo_facturacion)) {
        return 'El correo de facturación no tiene un formato válido.';
    }

    if (
        clientesRepository.existeDocumentoEnOtroCliente({
            id_cliente: idCliente,
            tipo_documento: datos.tipo_documento,
            documento: datos.documento,
        })
    ) {
        return 'Ya existe un cliente activo con ese tipo y número de documento.';
    }

    return null;
}

function crearCliente(payload = {}) {
    const datos = normalizarPayloadCliente(payload);
    const errorValidacion = validarCliente(datos);

    if (errorValidacion) {
        return {
            ok: false,
            mensaje: errorValidacion,
            datos,
            catalogos: obtenerCatalogosFormulario(),
        };
    }

    const cliente = clientesRepository.crearCliente(datos);

    return {
        ok: true,
        mensaje: 'Cliente creado correctamente.',
        cliente: prepararCliente(cliente),
    };
}

function actualizarCliente(idCliente, payload = {}) {
    const id = normalizarId(idCliente);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Cliente no válido.',
            catalogos: obtenerCatalogosFormulario(),
        };
    }

    const clienteActual = clientesRepository.obtenerClientePorId(id);

    if (!clienteActual) {
        return {
            ok: false,
            mensaje: 'No se encontró el cliente solicitado.',
            catalogos: obtenerCatalogosFormulario(),
        };
    }

    if (normalizarEntero(clienteActual.es_consumidor_final) === 1) {
        return {
            ok: false,
            mensaje: 'El consumidor final no se puede editar desde este formulario.',
            cliente: prepararCliente(clienteActual),
            catalogos: obtenerCatalogosFormulario(),
        };
    }

    const datos = normalizarPayloadCliente(payload);
    const errorValidacion = validarCliente(datos, id);

    if (errorValidacion) {
        return {
            ok: false,
            mensaje: errorValidacion,
            cliente: {
                id_cliente: id,
                ...datos,
            },
            catalogos: obtenerCatalogosFormulario(),
        };
    }

    const cliente = clientesRepository.actualizarCliente(id, datos);

    return {
        ok: true,
        mensaje: 'Cliente actualizado correctamente.',
        cliente: prepararCliente(cliente),
    };
}

function cambiarEstadoCliente(idCliente) {
    const id = normalizarId(idCliente);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Cliente no válido.',
        };
    }

    const cliente = clientesRepository.obtenerClientePorId(id);

    if (!cliente) {
        return {
            ok: false,
            mensaje: 'No se encontró el cliente solicitado.',
        };
    }

    if (normalizarEntero(cliente.es_consumidor_final) === 1) {
        return {
            ok: false,
            mensaje: 'No puedes desactivar el consumidor final.',
        };
    }

    const nuevoEstado = cliente.estado === 'activo' ? 'inactivo' : 'activo';
    const actualizado = clientesRepository.cambiarEstadoCliente(id, nuevoEstado);

    return {
        ok: true,
        mensaje: `Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} correctamente.`,
        cliente: prepararCliente(actualizado),
    };
}

module.exports = {
    obtenerListadoClientes,
    obtenerClienteParaFormulario,
    obtenerCatalogosFormulario,
    crearCliente,
    actualizarCliente,
    cambiarEstadoCliente,
};