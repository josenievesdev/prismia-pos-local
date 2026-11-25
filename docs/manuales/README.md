# Documentación de Prismia POS Local

> Índice maestro de la documentación formal de Prismia POS Local.
>
> Versión inicial: `0.1` · Fecha de creación: 2026-06-24.

---

## 1. Propósito de esta carpeta

La carpeta `docs/manuales/` contiene la **documentación formal inicial** de
Prismia POS Local.

Por ahora todos los documentos están en formato **Markdown** (`.md`).
Más adelante podrán convertirse a **PDF**, **Word** o **HTML** según se necesite
para entrega a clientes, contadores o soporte.

---

## 2. Documentos disponibles

| Orden | Documento | Público objetivo | Propósito |
| ----- | --------- | ---------------- | --------- |
| 00 | [00_MAPA_DOCUMENTAL_PRISMIA.md](./00_MAPA_DOCUMENTAL_PRISMIA.md) | Desarrollo / soporte | Mapa base del sistema: módulos, rutas, tablas, flujos y pendientes. |
| 01 | [01_MANUAL_USO_CLIENTES.md](./01_MANUAL_USO_CLIENTES.md) | Clientes, administradores y cajeros | Manual operativo paso a paso para usar el POS en el negocio. |
| 02 | [02_GUIA_CONTABLE_LOGICA_NEGOCIO.md](./02_GUIA_CONTABLE_LOGICA_NEGOCIO.md) | Contador, dueño, desarrollo | Explicación de IVA, ventas, costos, utilidad, caja, compras, inventario, anulaciones y notas crédito internas. |
| 03 | [03_GUIA_TECNICA_INTERNA_JOSE.md](./03_GUIA_TECNICA_INTERNA_JOSE.md) | Desarrollo / soporte (uso interno) | Guía interna técnica para desarrollo, soporte, instalación y mantenimiento. |

---

## 3. Orden recomendado de lectura

### Para desarrollo / soporte

```
1. 00_MAPA_DOCUMENTAL_PRISMIA.md
2. 03_GUIA_TECNICA_INTERNA_JOSE.md
3. 02_GUIA_CONTABLE_LOGICA_NEGOCIO.md
4. 01_MANUAL_USO_CLIENTES.md
```

### Para contador / dueño del negocio

```
1. 02_GUIA_CONTABLE_LOGICA_NEGOCIO.md
2. 01_MANUAL_USO_CLIENTES.md
```

### Para cliente final / cajero

```
1. 01_MANUAL_USO_CLIENTES.md
```

---

## 4. Estado actual de la documentación

* ✅ Ya existe una **base documental completa** (mapa, manual cliente, guía contable y guía técnica).
* ⏳ Aún **faltan capturas de pantalla** (ver [`CAPTURAS_REQUERIDAS.md`](./CAPTURAS_REQUERIDAS.md)).
* ⏳ Aún falta **revisión visual final** de formato y estilo.
* ⏳ Aún falta **conversión a PDF / Word**.
* ⏳ Aún falta **validación con cliente real** después del primer uso en producción.

Todos los documentos están en **versión inicial `0.1`**.

---

## 5. Pendientes documentales

- [ ] Agregar capturas de pantalla.
- [ ] Revisar estilo y formato final de cada documento.
- [ ] Convertir a PDF / Word.
- [ ] Crear versión resumida de instalación para cliente.
- [ ] Crear versión de soporte rápido.
- [ ] Revisar permisos por rol, acción por acción.
- [ ] Confirmar detalles pendientes del POS móvil / táctil.
- [ ] Confirmar reporte exacto de productos más vendidos.
- [ ] Resolver / documentar parche del error de puerto ocupado (`EADDRINUSE`) cuando se implemente.

---

## 6. Reglas para mantener estos documentos

1. **No documentar funcionalidades inexistentes.**
2. Marcar como `Pendiente de confirmar` lo que no esté validado.
3. **Actualizar primero el mapa** (`00_MAPA_DOCUMENTAL_PRISMIA.md`) si cambia la arquitectura.
4. **Actualizar la guía técnica** (`03_GUIA_TECNICA_INTERNA_JOSE.md`) si cambia código, rutas o scripts.
5. **Actualizar la guía contable** (`02_GUIA_CONTABLE_LOGICA_NEGOCIO.md`) si cambian fórmulas o reglas de negocio.
6. **Actualizar el manual cliente** (`01_MANUAL_USO_CLIENTES.md`) si cambia una pantalla o un flujo de uso.
7. **No incluir** secretos, claves privadas, `.env`, datos de clientes, backups ni información sensible en estos documentos.
