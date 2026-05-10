const proveedoresRepository = require('./proveedores.repository');

const TIPOS_DOCUMENTO_PERMITIDOS = ['NIT', 'CC', 'CE', 'PAS', 'OTRO'];
const ESTADOS_PERMITIDOS = ['activo', 'inactivo'];

function limpiarTexto(valor) {
    return String(valor || '').trim();
}

function limpiarCorreo(valor) {
    return limpiarTexto(valor).toLowerCase();
}

function normalizarId(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function normalizarEntero(valor, defecto = 1) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return defecto;
    }

    return numero;
}

function correoValido(correo) {
    if (!correo) {
        return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function prepararFiltros(query = {}) {
    const pagina = normalizarEntero(query.pagina, 1);
    const limite = 20;
    const busqueda = limpiarTexto(query.busqueda);
    const estado = limpiarTexto(query.estado);

    return {
        busqueda,
        estado: ESTADOS_PERMITIDOS.includes(estado) ? estado : '',
        pagina,
        limite,
        offset: (pagina - 1) * limite,
    };
}

function prepararProveedorFormulario(datos = {}) {
    return {
        id_proveedor: datos.id_proveedor || '',
        nombre_comercial: datos.nombre_comercial || '',
        razon_social: datos.razon_social || '',
        tipo_documento: datos.tipo_documento || 'NIT',
        documento: datos.documento || '',
        digito_verificacion: datos.digito_verificacion || '',
        telefono: datos.telefono || '',
        celular: datos.celular || '',
        correo: datos.correo || '',
        direccion: datos.direccion || '',
        ciudad: datos.ciudad || '',
        departamento: datos.departamento || '',
        contacto_nombre: datos.contacto_nombre || '',
        contacto_telefono: datos.contacto_telefono || '',
        observaciones: datos.observaciones || '',
        estado: datos.estado || 'activo',
    };
}

function prepararDatosProveedor(datos = {}) {
    const documento = limpiarTexto(datos.documento);

    return {
        nombre_comercial: limpiarTexto(datos.nombre_comercial),
        razon_social: limpiarTexto(datos.razon_social),
        tipo_documento: limpiarTexto(datos.tipo_documento) || 'NIT',
        documento: documento || null,
        digito_verificacion: limpiarTexto(datos.digito_verificacion),
        telefono: limpiarTexto(datos.telefono),
        celular: limpiarTexto(datos.celular),
        correo: limpiarCorreo(datos.correo),
        direccion: limpiarTexto(datos.direccion),
        ciudad: limpiarTexto(datos.ciudad),
        departamento: limpiarTexto(datos.departamento),
        contacto_nombre: limpiarTexto(datos.contacto_nombre),
        contacto_telefono: limpiarTexto(datos.contacto_telefono),
        observaciones: limpiarTexto(datos.observaciones),
        estado: limpiarTexto(datos.estado) || 'activo',
    };
}

function validarProveedor(datos = {}) {
    const errores = [];

    if (!datos.nombre_comercial) {
        errores.push('El nombre comercial del proveedor es obligatorio.');
    } else if (datos.nombre_comercial.length < 3) {
        errores.push('El nombre comercial debe tener mínimo 3 caracteres.');
    }

    const tieneDatoAdicional = [
        datos.documento,
        datos.telefono,
        datos.celular,
        datos.correo,
        datos.contacto_nombre,
        datos.contacto_telefono,
    ].some(Boolean);

    if (!tieneDatoAdicional) {
        errores.push('Registra al menos un dato adicional: documento, teléfono, celular, correo o contacto.');
    }

    if (!TIPOS_DOCUMENTO_PERMITIDOS.includes(datos.tipo_documento)) {
        errores.push('Selecciona un tipo de documento válido.');
    }

    if (datos.tipo_documento === 'NIT' && datos.digito_verificacion) {
        if (!/^\d$/.test(datos.digito_verificacion)) {
            errores.push('El dígito de verificación debe ser un solo número.');
        }
    }

    if (datos.documento && !/^[0-9A-Za-z.-]+$/.test(datos.documento)) {
        errores.push('El documento solo debe contener números, letras, puntos o guiones.');
    }

    if (!correoValido(datos.correo)) {
        errores.push('Ingresa un correo válido.');
    }

    if (!ESTADOS_PERMITIDOS.includes(datos.estado)) {
        errores.push('Selecciona un estado válido.');
    }

    return errores;
}

function listarProveedores(query = {}) {
    const filtrosIniciales = prepararFiltros(query);
    const totalResultados = proveedoresRepository.contarProveedores(filtrosIniciales);
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / filtrosIniciales.limite));
    const paginaActual = Math.min(filtrosIniciales.pagina, totalPaginas);
    const filtros = {
        ...filtrosIniciales,
        pagina: paginaActual,
        offset: (paginaActual - 1) * filtrosIniciales.limite,
    };

    const proveedores = proveedoresRepository.listarProveedores(filtros);

    return {
        filtros,
        proveedores: proveedores.map((proveedor) => ({
            ...proveedor,
            nombre_mostrar:
                proveedor.nombre_comercial ||
                proveedor.razon_social ||
                `Proveedor #${proveedor.id_proveedor}`,
            documento_mostrar: proveedor.documento
                ? `${proveedor.tipo_documento || 'Doc'} ${proveedor.documento}${proveedor.digito_verificacion ? '-' + proveedor.digito_verificacion : ''}`
                : 'Sin documento',
            contacto_mostrar: [
                proveedor.telefono,
                proveedor.celular,
                proveedor.correo,
            ].filter(Boolean).join(' · ') || 'Sin contacto',
            estado_etiqueta: proveedor.estado === 'activo' ? 'Activo' : 'Inactivo',
        })),
        total_resultados: totalResultados,
        limite_resultados: filtros.limite,
        pagina_actual: filtros.pagina,
        total_paginas: totalPaginas,
        tiene_pagina_anterior: filtros.pagina > 1,
        tiene_pagina_siguiente: filtros.pagina < totalPaginas,
        pagina_anterior: Math.max(1, filtros.pagina - 1),
        pagina_siguiente: Math.min(totalPaginas, filtros.pagina + 1),
    };
}

function obtenerProveedorParaEdicion(idProveedor) {
    const id = normalizarId(idProveedor);

    if (!id) {
        return null;
    }

    return proveedoresRepository.obtenerProveedorPorId(id);
}

function crearProveedor(datosFormulario = {}) {
    const datos = prepararDatosProveedor(datosFormulario);
    const errores = validarProveedor(datos);

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
            valores: prepararProveedorFormulario(datos),
        };
    }

    if (datos.documento) {
        const existente = proveedoresRepository.obtenerProveedorPorDocumento({
            tipoDocumento: datos.tipo_documento,
            documento: datos.documento,
        });

        if (existente) {
            return {
                ok: false,
                mensaje: 'Ya existe un proveedor con ese tipo y número de documento.',
                valores: prepararProveedorFormulario(datos),
            };
        }
    }

    proveedoresRepository.crearProveedor(datos);

    return {
        ok: true,
        mensaje: 'Proveedor creado correctamente.',
    };
}

function actualizarProveedor(idProveedor, datosFormulario = {}) {
    const id = normalizarId(idProveedor);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Proveedor no válido.',
        };
    }

    const proveedorActual = proveedoresRepository.obtenerProveedorPorId(id);

    if (!proveedorActual) {
        return {
            ok: false,
            mensaje: 'No se encontró el proveedor.',
        };
    }

    const datos = prepararDatosProveedor(datosFormulario);
    const errores = validarProveedor(datos);

    if (errores.length > 0) {
        return {
            ok: false,
            mensaje: errores[0],
            valores: prepararProveedorFormulario({
                ...proveedorActual,
                ...datos,
            }),
        };
    }

    if (datos.documento) {
        const existente = proveedoresRepository.obtenerProveedorPorDocumento({
            tipoDocumento: datos.tipo_documento,
            documento: datos.documento,
        });

        if (existente && Number(existente.id_proveedor) !== Number(id)) {
            return {
                ok: false,
                mensaje: 'Ya existe otro proveedor con ese tipo y número de documento.',
                valores: prepararProveedorFormulario({
                    ...proveedorActual,
                    ...datos,
                }),
            };
        }
    }

    proveedoresRepository.actualizarProveedor(id, datos);

    return {
        ok: true,
        mensaje: 'Proveedor actualizado correctamente.',
    };
}

function cambiarEstadoProveedor(idProveedor, estado) {
    const id = normalizarId(idProveedor);
    const nuevoEstado = limpiarTexto(estado);

    if (!id) {
        return {
            ok: false,
            mensaje: 'Proveedor no válido.',
        };
    }

    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
        return {
            ok: false,
            mensaje: 'Estado no válido.',
        };
    }

    const proveedor = proveedoresRepository.obtenerProveedorPorId(id);

    if (!proveedor) {
        return {
            ok: false,
            mensaje: 'No se encontró el proveedor.',
        };
    }

    proveedoresRepository.cambiarEstadoProveedor(id, nuevoEstado);

    return {
        ok: true,
        mensaje: nuevoEstado === 'activo'
            ? 'Proveedor activado correctamente.'
            : 'Proveedor desactivado correctamente.',
    };
}

module.exports = {
    listarProveedores,
    prepararProveedorFormulario,
    obtenerProveedorParaEdicion,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor,
};