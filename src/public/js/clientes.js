(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', iniciarFormularioClientes);

    function iniciarFormularioClientes() {
        inicializarTipoCliente();
        inicializarBuscadoresUbicacion();
        inicializarValidacionFormulario();
    }

    function inicializarTipoCliente() {
        const tipoCliente = document.getElementById('tipoCliente');
        const tipoDocumento = document.getElementById('tipoDocumento');
        const seccionNatural = document.querySelector('[data-client-section="natural"]');
        const seccionJuridica = document.querySelector('[data-client-section="juridica"]');
        const camposJuridicos = document.querySelectorAll('[data-juridica-field]');

        function actualizarVisibilidad() {
            if (!tipoCliente) return;

            const esJuridica = tipoCliente.value === 'persona_juridica';

            if (seccionNatural) {
                seccionNatural.hidden = esJuridica;
            }

            if (seccionJuridica) {
                seccionJuridica.hidden = !esJuridica;
            }

            camposJuridicos.forEach(function (campo) {
                campo.hidden = !esJuridica;
            });

            if (esJuridica && tipoDocumento) {
                tipoDocumento.value = 'NIT';
            }

            actualizarMarcadoresObligatorios();
        }

        tipoCliente?.addEventListener('change', actualizarVisibilidad);
        tipoDocumento?.addEventListener('change', actualizarMarcadoresObligatorios);

        actualizarVisibilidad();
    }

    function inicializarValidacionFormulario() {
        const formulario = document.querySelector('.clientes-form');

        if (!formulario) {
            return;
        }

        formulario.addEventListener('submit', function (evento) {
            limpiarErroresFormulario(formulario);

            const validacion = validarFormularioCliente(formulario);

            if (!validacion.ok) {
                evento.preventDefault();

                marcarCampoConError(validacion.campo, validacion.mensaje);
                enfocarCampo(validacion.campo);

                return false;
            }

            return true;
        });

        formulario.addEventListener('input', function (evento) {
            limpiarErrorCampo(evento.target);
        });

        formulario.addEventListener('change', function (evento) {
            limpiarErrorCampo(evento.target);
        });

        actualizarMarcadoresObligatorios();
    }

    function validarFormularioCliente(formulario) {
        const tipoCliente = obtenerCampo(formulario, 'tipo_cliente');
        const tipoDocumento = obtenerCampo(formulario, 'tipo_documento');
        const documento = obtenerCampo(formulario, 'documento');
        const digitoVerificacion = obtenerCampo(formulario, 'digito_verificacion');

        const primerNombre = obtenerCampo(formulario, 'primer_nombre');
        const primerApellido = obtenerCampo(formulario, 'primer_apellido');

        const razonSocial = obtenerCampo(formulario, 'razon_social');
        const nombreComercial = obtenerCampo(formulario, 'nombre_comercial');

        const correo = obtenerCampo(formulario, 'correo');
        const correoFacturacion = obtenerCampo(formulario, 'correo_facturacion');

        if (!valorCampo(tipoCliente)) {
            return crearErrorValidacion(tipoCliente, 'Selecciona el tipo de cliente.');
        }

        if (!valorCampo(tipoDocumento)) {
            return crearErrorValidacion(tipoDocumento, 'Selecciona el tipo de documento.');
        }

        if (!valorCampo(documento)) {
            return crearErrorValidacion(documento, 'Digita el número de documento.');
        }

        const esJuridica = valorCampo(tipoCliente) === 'persona_juridica';
        const esNit = valorCampo(tipoDocumento) === 'NIT';

        if ((esJuridica || esNit) && !valorCampo(digitoVerificacion)) {
            return crearErrorValidacion(digitoVerificacion, 'Digita el dígito de verificación del NIT.');
        }

        if (esJuridica) {
            if (!valorCampo(razonSocial) && !valorCampo(nombreComercial)) {
                return crearErrorValidacion(
                    razonSocial,
                    'Digita la razón social o el nombre comercial.'
                );
            }
        } else {
            if (!valorCampo(primerNombre)) {
                return crearErrorValidacion(primerNombre, 'Digita el primer nombre del cliente.');
            }

            if (!valorCampo(primerApellido)) {
                return crearErrorValidacion(primerApellido, 'Digita el primer apellido del cliente.');
            }
        }

        if (valorCampo(correo) && !correoValido(valorCampo(correo))) {
            return crearErrorValidacion(correo, 'El correo principal no tiene un formato válido.');
        }

        if (valorCampo(correoFacturacion) && !correoValido(valorCampo(correoFacturacion))) {
            return crearErrorValidacion(
                correoFacturacion,
                'El correo de facturación no tiene un formato válido.'
            );
        }

        return {
            ok: true,
        };
    }

    function obtenerCampo(formulario, nombre) {
        return formulario.querySelector(`[name="${nombre}"]`);
    }

    function valorCampo(campo) {
        return campo ? String(campo.value || '').trim() : '';
    }

    function crearErrorValidacion(campo, mensaje) {
        return {
            ok: false,
            campo,
            mensaje,
        };
    }

    function correoValido(correo) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    }

    function marcarCampoConError(campo, mensaje) {
        if (!campo) {
            return;
        }

        const grupo = campo.closest('.form-group');

        campo.classList.add('is-invalid');
        campo.setAttribute('aria-invalid', 'true');

        if (grupo) {
            grupo.classList.add('has-error');

            let mensajeError = grupo.querySelector('.clientes-field-error');

            if (!mensajeError) {
                mensajeError = document.createElement('small');
                mensajeError.className = 'clientes-field-error';
                grupo.appendChild(mensajeError);
            }

            mensajeError.textContent = mensaje;
        }

        campo.setCustomValidity(mensaje);
        campo.reportValidity();

        setTimeout(function () {
            campo.setCustomValidity('');
        }, 500);
    }

    function limpiarErrorCampo(campo) {
        if (!campo || !campo.classList) {
            return;
        }

        campo.classList.remove('is-invalid');
        campo.removeAttribute('aria-invalid');
        campo.setCustomValidity('');

        const grupo = campo.closest('.form-group');

        if (grupo) {
            grupo.classList.remove('has-error');

            const mensajeError = grupo.querySelector('.clientes-field-error');

            if (mensajeError) {
                mensajeError.remove();
            }
        }
    }

    function limpiarErroresFormulario(formulario) {
        formulario.querySelectorAll('.is-invalid').forEach(limpiarErrorCampo);

        formulario.querySelectorAll('.has-error').forEach(function (grupo) {
            grupo.classList.remove('has-error');
        });

        formulario.querySelectorAll('.clientes-field-error').forEach(function (mensaje) {
            mensaje.remove();
        });
    }

    function enfocarCampo(campo) {
        if (!campo) {
            return;
        }

        campo.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });

        setTimeout(function () {
            campo.focus({ preventScroll: true });
        }, 250);
    }

    function actualizarMarcadoresObligatorios() {
        const formulario = document.querySelector('.clientes-form');

        if (!formulario) {
            return;
        }

        formulario.querySelectorAll('.clientes-required-marker').forEach(function (marca) {
            marca.remove();
        });

        const tipoCliente = formulario.querySelector('[name="tipo_cliente"]');
        const tipoDocumento = formulario.querySelector('[name="tipo_documento"]');

        const esJuridica = valorCampo(tipoCliente) === 'persona_juridica';
        const esNit = valorCampo(tipoDocumento) === 'NIT';

        const camposObligatorios = [
            'tipo_cliente',
            'tipo_documento',
            'documento',
        ];

        if (esJuridica) {
            camposObligatorios.push('razon_social');
        } else {
            camposObligatorios.push('primer_nombre');
            camposObligatorios.push('primer_apellido');
        }

        if (esJuridica || esNit) {
            camposObligatorios.push('digito_verificacion');
        }

        camposObligatorios.forEach(function (nombreCampo) {
            const campo = formulario.querySelector(`[name="${nombreCampo}"]`);

            if (!campo) {
                return;
            }

            const grupo = campo.closest('.form-group');
            const etiqueta = grupo ? grupo.querySelector('span') : null;

            if (!etiqueta) {
                return;
            }

            const marcador = document.createElement('b');
            marcador.className = 'clientes-required-marker';
            marcador.textContent = ' *';

            etiqueta.appendChild(marcador);
        });
    }

    function inicializarBuscadoresUbicacion() {
        const inputBuscarDepartamento = document.getElementById('buscarDepartamentoCliente');
        const panelDepartamentos = document.getElementById('resultadosDepartamentosCliente');

        const inputBuscarMunicipio = document.getElementById('buscarMunicipioCliente');
        const panelMunicipios = document.getElementById('resultadosMunicipiosCliente');

        if (!inputBuscarDepartamento || !panelDepartamentos || !inputBuscarMunicipio || !panelMunicipios) {
            return;
        }

        const inputPais = document.getElementById('paisCliente');
        const inputCodigoPais = document.getElementById('codigoPaisCliente');
        const inputDepartamento = document.getElementById('departamentoCliente');
        const inputCodigoDepartamento = document.getElementById('codigoDepartamentoCliente');
        const inputMunicipio = document.getElementById('municipioCliente');
        const inputCodigoMunicipio = document.getElementById('codigoMunicipioCliente');

        let temporizadorDepartamento = null;
        let temporizadorMunicipio = null;
        let abortDepartamento = null;
        let abortMunicipio = null;

        actualizarEstadoMunicipio();

        inputBuscarDepartamento.addEventListener('input', function () {
            clearTimeout(temporizadorDepartamento);

            const termino = inputBuscarDepartamento.value.trim();

            limpiarDepartamentoSeleccionado({
                inputDepartamento,
                inputCodigoDepartamento,
                inputMunicipio,
                inputCodigoMunicipio,
                inputBuscarMunicipio,
            });

            if (termino.length < 2) {
                ocultarResultados(panelDepartamentos);
                actualizarEstadoMunicipio();
                return;
            }

            temporizadorDepartamento = setTimeout(function () {
                buscarDepartamentos(termino, panelDepartamentos, function (nuevoController) {
                    abortDepartamento = nuevoController;
                }, abortDepartamento);
            }, 180);
        });

        inputBuscarDepartamento.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                ocultarResultados(panelDepartamentos);
                inputBuscarDepartamento.blur();
            }
        });

        panelDepartamentos.addEventListener('click', function (evento) {
            const boton = evento.target.closest('[data-departamento-item]');

            if (!boton) {
                return;
            }

            const departamento = {
                nombre_departamento: boton.dataset.nombreDepartamento || '',
                codigo_departamento: boton.dataset.codigoDepartamento || '',
                pais: boton.dataset.pais || 'Colombia',
                codigo_pais: boton.dataset.codigoPais || 'CO',
            };

            seleccionarDepartamento({
                departamento,
                inputBuscarDepartamento,
                inputPais,
                inputCodigoPais,
                inputDepartamento,
                inputCodigoDepartamento,
                inputBuscarMunicipio,
                inputMunicipio,
                inputCodigoMunicipio,
                panelDepartamentos,
            });
        });

        inputBuscarMunicipio.addEventListener('input', function () {
            clearTimeout(temporizadorMunicipio);

            const termino = inputBuscarMunicipio.value.trim();
            const codigoDepartamento = inputCodigoDepartamento ? inputCodigoDepartamento.value.trim() : '';

            if (!codigoDepartamento) {
                renderizarMunicipiosMensaje(panelMunicipios, 'Selecciona primero un departamento.');
                return;
            }

            if (inputMunicipio) inputMunicipio.value = '';
            if (inputCodigoMunicipio) inputCodigoMunicipio.value = '';

            if (termino.length < 1) {
                ocultarResultados(panelMunicipios);
                return;
            }

            temporizadorMunicipio = setTimeout(function () {
                buscarMunicipios({
                    termino,
                    codigoDepartamento,
                    panelMunicipios,
                    setAbortController: function (nuevoController) {
                        abortMunicipio = nuevoController;
                    },
                    abortControllerActual: abortMunicipio,
                });
            }, 180);
        });

        inputBuscarMunicipio.addEventListener('focus', function () {
            const codigoDepartamento = inputCodigoDepartamento ? inputCodigoDepartamento.value.trim() : '';

            if (!codigoDepartamento) {
                renderizarMunicipiosMensaje(panelMunicipios, 'Selecciona primero un departamento.');
            }
        });

        inputBuscarMunicipio.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                ocultarResultados(panelMunicipios);
                inputBuscarMunicipio.blur();
            }
        });

        panelMunicipios.addEventListener('click', function (evento) {
            const boton = evento.target.closest('[data-municipio-item]');

            if (!boton) {
                return;
            }

            const municipio = {
                nombre_municipio: boton.dataset.nombreMunicipio || '',
                codigo_municipio: boton.dataset.codigoMunicipio || '',
                nombre_departamento: boton.dataset.nombreDepartamento || '',
                codigo_departamento: boton.dataset.codigoDepartamento || '',
                pais: boton.dataset.pais || 'Colombia',
                codigo_pais: boton.dataset.codigoPais || 'CO',
            };

            seleccionarMunicipio({
                municipio,
                inputBuscarMunicipio,
                inputPais,
                inputCodigoPais,
                inputDepartamento,
                inputCodigoDepartamento,
                inputMunicipio,
                inputCodigoMunicipio,
                panelMunicipios,
            });
        });

        document.addEventListener('click', function (evento) {
            const dentroUbicacion = evento.target.closest('.clientes-location-search');

            if (!dentroUbicacion) {
                ocultarResultados(panelDepartamentos);
                ocultarResultados(panelMunicipios);
            }
        });

        function actualizarEstadoMunicipio() {
            const codigoDepartamento = inputCodigoDepartamento ? inputCodigoDepartamento.value.trim() : '';

            inputBuscarMunicipio.disabled = !codigoDepartamento;

            if (!codigoDepartamento) {
                inputBuscarMunicipio.value = '';
                inputBuscarMunicipio.placeholder = 'Selecciona primero un departamento...';
            } else {
                inputBuscarMunicipio.placeholder = 'Ej: Valledupar, Pereira, Codazzi...';
            }
        }

        function limpiarDepartamentoSeleccionado({
            inputDepartamento,
            inputCodigoDepartamento,
            inputMunicipio,
            inputCodigoMunicipio,
            inputBuscarMunicipio,
        }) {
            if (inputDepartamento) inputDepartamento.value = '';
            if (inputCodigoDepartamento) inputCodigoDepartamento.value = '';
            if (inputMunicipio) inputMunicipio.value = '';
            if (inputCodigoMunicipio) inputCodigoMunicipio.value = '';
            if (inputBuscarMunicipio) inputBuscarMunicipio.value = '';

            actualizarEstadoMunicipio();
        }
    }

    async function buscarDepartamentos(termino, panelDepartamentos, setAbortController, abortControllerActual) {
        if (abortControllerActual) {
            abortControllerActual.abort();
        }

        const nuevoController = new AbortController();
        setAbortController(nuevoController);

        try {
            const respuesta = await fetch(`/catalogos/departamentos/buscar?busqueda=${encodeURIComponent(termino)}`, {
                signal: nuevoController.signal,
            });

            const datos = await respuesta.json();

            if (!datos.ok || !Array.isArray(datos.departamentos)) {
                renderizarDepartamentos([], panelDepartamentos);
                return;
            }

            renderizarDepartamentos(datos.departamentos, panelDepartamentos);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error buscando departamentos:', error);
            }
        }
    }

    async function buscarMunicipios({
        termino,
        codigoDepartamento,
        panelMunicipios,
        setAbortController,
        abortControllerActual,
    }) {
        if (abortControllerActual) {
            abortControllerActual.abort();
        }

        const nuevoController = new AbortController();
        setAbortController(nuevoController);

        const params = new URLSearchParams();
        params.set('busqueda', termino);
        params.set('codigo_departamento', codigoDepartamento);

        try {
            const respuesta = await fetch(`/catalogos/municipios/buscar?${params.toString()}`, {
                signal: nuevoController.signal,
            });

            const datos = await respuesta.json();

            if (!datos.ok || !Array.isArray(datos.municipios)) {
                renderizarMunicipios([], panelMunicipios);
                return;
            }

            renderizarMunicipios(datos.municipios, panelMunicipios);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error buscando municipios:', error);
            }
        }
    }

    function renderizarDepartamentos(departamentos, panelDepartamentos) {
        panelDepartamentos.hidden = false;

        if (departamentos.length === 0) {
            panelDepartamentos.innerHTML = `
                <div class="clientes-location-empty">
                    No se encontraron departamentos.
                </div>
            `;
            return;
        }

        panelDepartamentos.innerHTML = departamentos.map(function (departamento) {
            return `
                <button
                    type="button"
                    class="clientes-location-result"
                    data-departamento-item
                    data-nombre-departamento="${escaparHtml(departamento.nombre_departamento)}"
                    data-codigo-departamento="${escaparHtml(departamento.codigo_departamento)}"
                    data-pais="${escaparHtml(departamento.pais || 'Colombia')}"
                    data-codigo-pais="${escaparHtml(departamento.codigo_pais || 'CO')}"
                >
                    <strong>${escaparHtml(departamento.nombre_departamento)}</strong>
                    <span>Código departamento: ${escaparHtml(departamento.codigo_departamento)}</span>
                </button>
            `;
        }).join('');
    }

    function renderizarMunicipios(municipios, panelMunicipios) {
        panelMunicipios.hidden = false;

        if (municipios.length === 0) {
            renderizarMunicipiosMensaje(panelMunicipios, 'No se encontraron municipios para ese departamento.');
            return;
        }

        panelMunicipios.innerHTML = municipios.map(function (municipio) {
            return `
                <button
                    type="button"
                    class="clientes-location-result"
                    data-municipio-item
                    data-nombre-municipio="${escaparHtml(municipio.nombre_municipio)}"
                    data-codigo-municipio="${escaparHtml(municipio.codigo_municipio)}"
                    data-nombre-departamento="${escaparHtml(municipio.nombre_departamento)}"
                    data-codigo-departamento="${escaparHtml(municipio.codigo_departamento)}"
                    data-pais="${escaparHtml(municipio.pais || 'Colombia')}"
                    data-codigo-pais="${escaparHtml(municipio.codigo_pais || 'CO')}"
                >
                    <strong>${escaparHtml(municipio.nombre_municipio)}</strong>
                    <span>${escaparHtml(municipio.nombre_departamento)} · ${escaparHtml(municipio.codigo_municipio)}</span>
                </button>
            `;
        }).join('');
    }

    function renderizarMunicipiosMensaje(panelMunicipios, mensaje) {
        panelMunicipios.hidden = false;
        panelMunicipios.innerHTML = `
            <div class="clientes-location-empty">
                ${escaparHtml(mensaje)}
            </div>
        `;
    }

    function seleccionarDepartamento({
        departamento,
        inputBuscarDepartamento,
        inputPais,
        inputCodigoPais,
        inputDepartamento,
        inputCodigoDepartamento,
        inputBuscarMunicipio,
        inputMunicipio,
        inputCodigoMunicipio,
        panelDepartamentos,
    }) {
        if (inputBuscarDepartamento) {
            inputBuscarDepartamento.value = departamento.nombre_departamento;
        }

        if (inputPais) inputPais.value = departamento.pais || 'Colombia';
        if (inputCodigoPais) inputCodigoPais.value = departamento.codigo_pais || 'CO';
        if (inputDepartamento) inputDepartamento.value = departamento.nombre_departamento;
        if (inputCodigoDepartamento) inputCodigoDepartamento.value = departamento.codigo_departamento;

        if (inputBuscarMunicipio) {
            inputBuscarMunicipio.disabled = false;
            inputBuscarMunicipio.value = '';
            inputBuscarMunicipio.placeholder = 'Ej: Valledupar, Pereira, Codazzi...';
            inputBuscarMunicipio.focus();
        }

        if (inputMunicipio) inputMunicipio.value = '';
        if (inputCodigoMunicipio) inputCodigoMunicipio.value = '';

        ocultarResultados(panelDepartamentos);
    }

    function seleccionarMunicipio({
        municipio,
        inputBuscarMunicipio,
        inputPais,
        inputCodigoPais,
        inputDepartamento,
        inputCodigoDepartamento,
        inputMunicipio,
        inputCodigoMunicipio,
        panelMunicipios,
    }) {
        if (inputBuscarMunicipio) {
            inputBuscarMunicipio.value = municipio.nombre_municipio;
        }

        if (inputPais) inputPais.value = municipio.pais || 'Colombia';
        if (inputCodigoPais) inputCodigoPais.value = municipio.codigo_pais || 'CO';
        if (inputDepartamento) inputDepartamento.value = municipio.nombre_departamento;
        if (inputCodigoDepartamento) inputCodigoDepartamento.value = municipio.codigo_departamento;
        if (inputMunicipio) inputMunicipio.value = municipio.nombre_municipio;
        if (inputCodigoMunicipio) inputCodigoMunicipio.value = municipio.codigo_municipio;

        ocultarResultados(panelMunicipios);
    }

    function ocultarResultados(panel) {
        if (!panel) {
            return;
        }

        panel.hidden = true;
        panel.innerHTML = '';
    }

    function escaparHtml(valor) {
        const div = document.createElement('div');
        div.textContent = String(valor || '');
        return div.innerHTML;
    }
})();