
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const mensaje = document.getElementById("mensaje-admin");

    let productos = [];
    let promociones = [];
    let compras = [];

    const encabezados = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    const escapar = (valor) => String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const dinero = (valor) => Number(valor || 0).toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
    });

    const fecha = (valor) => {
        if (!valor) return "-";

        const texto = String(valor).slice(0, 10);
        const partes = texto.split("-");

        if (partes.length !== 3) return texto;

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const mostrarMensaje = (texto, tipo = "success") => {
        mensaje.textContent = texto;
        mensaje.className = `alert alert-${tipo}`;
        mensaje.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const ocultarMensaje = () => {
        mensaje.textContent = "";
        mensaje.className = "alert d-none";
    };

    const peticion = async (ruta, opciones = {}) => {
        const respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: {
                ...encabezados,
                ...(opciones.headers || {})
            }
        });

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || "Ocurrió un error en la operación");
        }

        return datos;
    };

    const verificarAdministrador = async () => {
        if (!token) {
            window.location.href = "login.html";
            return false;
        }

        try {
            const datos = await peticion("/auth/perfil");

            if (!datos.usuario || datos.usuario.rol !== "admin") {
                alert("No tenés permisos para acceder al panel administrativo.");
                window.location.href = "index.html";
                return false;
            }

            return true;
        } catch (error) {
            console.error("Error al verificar el administrador:", error);

            mostrarMensaje(
                "No se pudo verificar el acceso. Comprobá que el servidor esté funcionando.",
                "danger"
            );

            return false;
        }
    };

    // Navegación entre secciones
    document.querySelectorAll(".admin-nav").forEach(boton => {
        boton.addEventListener("click", () => {
            const seccion = boton.dataset.seccion;

            document.querySelectorAll(".admin-nav").forEach(item => {
                item.classList.remove("activo");
            });

            document.querySelectorAll(".admin-seccion").forEach(item => {
                item.classList.add("d-none");
            });

            boton.classList.add("activo");
            document.getElementById(`seccion-${seccion}`).classList.remove("d-none");

            ocultarMensaje();

            if (seccion === "inicio") cargarEstadisticas();
            if (seccion === "productos") cargarProductos();
            if (seccion === "stock") cargarStock();
            if (seccion === "promociones") cargarPromociones();
            if (seccion === "ventas") cargarCompras();
        });
    });

    // Cerrar sesión
    document.getElementById("cerrar-sesion-admin").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "index.html";
    });

    // Abrir y cerrar modales
    const abrirModal = (id) => {
        document.getElementById(id).classList.remove("d-none");
    };

    const cerrarModal = (id) => {
        document.getElementById(id).classList.add("d-none");
    };

    document.querySelectorAll("[data-cerrar-modal]").forEach(boton => {
        boton.addEventListener("click", () => {
            cerrarModal(boton.dataset.cerrarModal);
        });
    });

    document.querySelectorAll(".admin-modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.classList.add("d-none");
            }
        });
    });

    // =========================
    // PANEL PRINCIPAL
    // =========================

    const cargarEstadisticas = async () => {
        try {
            const datos = await peticion("/admin/estadisticas");
            const resumen = datos.resumen || {};

            document.getElementById("total-ingresos").textContent =
                dinero(resumen.ingresos);

            document.getElementById("total-compras").textContent =
                resumen.cantidad_compras || 0;

            document.getElementById("total-pendientes").textContent =
                resumen.compras_pendientes || 0;

            document.getElementById("total-pagadas").textContent =
                resumen.compras_pagadas || 0;

            const masVendidos = datos.productos_mas_vendidos || [];
            const sinStock = datos.productos_sin_stock || [];

            document.getElementById("productos-mas-vendidos").innerHTML =
                masVendidos.length
                    ? `<ul class="admin-lista">
                        ${masVendidos.map(p => `
                            <li>
                                <span>${escapar(p.nombre)}</span>
                                <strong>${escapar(p.total_vendido)}</strong>
                            </li>
                        `).join("")}
                       </ul>`
                    : "<p>No hay ventas registradas.</p>";

            document.getElementById("productos-sin-stock").innerHTML =
                sinStock.length
                    ? `<ul class="admin-lista">
                        ${sinStock.map(p => `
                            <li>${escapar(p.nombre)}</li>
                        `).join("")}
                       </ul>`
                    : "<p>No hay productos sin stock.</p>";

        } catch (error) {
            mostrarMensaje(
                `No se pudieron cargar las estadísticas: ${error.message}`,
                "danger"
            );
        }
    };

    // =========================
    // PRODUCTOS
    // =========================

    const cargarProductos = async () => {
        try {
            const datos = await peticion("/admin/productos");
            productos = datos.productos || [];

            const tabla = document.getElementById("tabla-productos");

            if (productos.length === 0) {
                tabla.innerHTML = `<tr><td colspan="8">No hay productos registrados.</td></tr>`;
                return;
            }

            tabla.innerHTML = productos.map(p => `
                <tr>
                    <td>${escapar(p.id)}</td>
                    <td>${escapar(p.nombre)}</td>
                    <td>${escapar(p.sabor || "-")}</td>
                    <td>${escapar(p.cantidad)}</td>
                    <td>${dinero(p.precio)}</td>
                    <td>${escapar(p.stock)}</td>
                    <td>
                        <span class="admin-estado ${p.disponibilidad ? "estado-activo" : "estado-inactivo"}">
                            ${p.disponibilidad ? "Disponible" : "No disponible"}
                        </span>
                    </td>
                    <td>
                        <div class="admin-acciones">
                            <button class="btn-tabla" data-editar-producto="${p.id}">
                                Editar
                            </button>
                            <button class="btn-tabla"
                                    data-disponibilidad="${p.id}"
                                    data-valor="${!p.disponibilidad}">
                                ${p.disponibilidad ? "Desactivar" : "Activar"}
                            </button>
                        </div>
                    </td>
                </tr>
            `).join("");

            cargarSelectoresProductos();

        } catch (error) {
            mostrarMensaje(`No se pudieron cargar los productos: ${error.message}`, "danger");
        }
    };

    const cargarSelectoresProductos = () => {
        const sabores = [...new Map(
            productos.map(p => [p.id_sabor, {
                id: p.id_sabor,
                nombre: p.sabor
            }])
        ).values()].filter(s => s.id && s.nombre);

        const opcionesSabor = sabores.map(s =>
            `<option value="${escapar(s.id)}">${escapar(s.nombre)}</option>`
        ).join("");

        document.getElementById("producto-sabor").innerHTML =
            `<option value="">Seleccionar sabor</option>${opcionesSabor}`;

        const opcionesProductos = productos.map(p =>
            `<option value="${p.id}">${escapar(p.nombre)}</option>`
        ).join("");

        document.getElementById("stock-producto").innerHTML =
            `<option value="">Seleccionar producto</option>${opcionesProductos}`;

        document.getElementById("promo-producto").innerHTML =
            `<option value="">Seleccionar producto</option>${opcionesProductos}`;

        document.getElementById("promo-complementario").innerHTML =
            `<option value="">Sin producto complementario</option>${opcionesProductos}`;
    };

    document.getElementById("nuevo-producto").addEventListener("click", () => {
        document.getElementById("form-producto").reset();
        document.getElementById("producto-id").value = "";
        document.getElementById("producto-stock").value = 0;
        document.getElementById("producto-stock").disabled = false;
        document.getElementById("contenedor-stock-producto").classList.remove("d-none");
        document.getElementById("titulo-modal-producto").textContent = "Agregar producto";
        abrirModal("modal-producto");
    });

    document.getElementById("tabla-productos").addEventListener("click", async event => {
        const editar = event.target.closest("[data-editar-producto]");
        const disponibilidad = event.target.closest("[data-disponibilidad]");

        try {
            if (editar) {
                const id = Number(editar.dataset.editarProducto);
                const p = productos.find(item => Number(item.id) === id);

                if (!p) return;

                document.getElementById("form-producto").reset();
                document.getElementById("producto-id").value = p.id;
                document.getElementById("producto-nombre").value = p.nombre;
                document.getElementById("producto-sabor").value = p.id_sabor;
                document.getElementById("producto-cantidad").value = p.cantidad;
                document.getElementById("producto-precio").value = p.precio;
                document.getElementById("producto-imagen").value = p.imagen || "";
                document.getElementById("producto-especial").checked = p.edicionespecial;

                // El stock se modifica desde la sección Stock.
                document.getElementById("producto-stock").disabled = true;
                document.getElementById("contenedor-stock-producto").classList.add("d-none");

                document.getElementById("titulo-modal-producto").textContent = "Editar producto";
                abrirModal("modal-producto");
            }

            if (disponibilidad) {
                const id = disponibilidad.dataset.disponibilidad;
                const valor = disponibilidad.dataset.valor === "true";

                await peticion(`/admin/productos/${id}/disponibilidad`, {
                    method: "PATCH",
                    body: JSON.stringify({ disponibilidad: valor })
                });

                mostrarMensaje("Disponibilidad actualizada correctamente.");
                await cargarProductos();
            }

        } catch (error) {
            mostrarMensaje(error.message, "danger");
        }
    });

    document.getElementById("form-producto").addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("producto-id").value;

        const producto = {
            nombre: document.getElementById("producto-nombre").value.trim(),
            id_sabor: Number(document.getElementById("producto-sabor").value),
            cantidad: Number(document.getElementById("producto-cantidad").value),
            precio: Number(document.getElementById("producto-precio").value),
            imagen: document.getElementById("producto-imagen").value.trim() || null,
            edicionespecial: document.getElementById("producto-especial").checked
        };

        if (!id) {
            producto.stock = Number(document.getElementById("producto-stock").value);
        }

        try {
            const datos = await peticion(
                id ? `/admin/productos/${id}` : "/admin/productos",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(producto)
                }
            );

            cerrarModal("modal-producto");
            mostrarMensaje(datos.mensaje || "Producto guardado correctamente.");
            await cargarProductos();
            await cargarStock();

        } catch (error) {
            mostrarMensaje(error.message, "danger");
        }
    });

    // =========================
    // STOCK
    // =========================

    const cargarStock = async () => {
        try {
            if (productos.length === 0) {
                const datos = await peticion("/admin/productos");
                productos = datos.productos || [];
                cargarSelectoresProductos();
            }

            const tabla = document.getElementById("tabla-stock");

            tabla.innerHTML = productos.map(p => `
                <tr>
                    <td>${escapar(p.nombre)}</td>
                    <td>${escapar(p.sabor || "-")}</td>
                    <td><strong>${escapar(p.stock)}</strong></td>
                    <td>
                        <span class="admin-estado ${p.disponibilidad ? "estado-activo" : "estado-inactivo"}">
                            ${p.disponibilidad ? "Disponible" : "No disponible"}
                        </span>
                    </td>
                </tr>
            `).join("");

        } catch (error) {
            mostrarMensaje(`No se pudo cargar el stock: ${error.message}`, "danger");
        }
    };

    document.getElementById("form-ingreso-stock").addEventListener("submit", async event => {
        event.preventDefault();

        const idproducto = Number(document.getElementById("stock-producto").value);
        const cantidadingreso = Number(document.getElementById("stock-cantidad").value);

        try {
            const datos = await peticion("/admin/ingresos", {
                method: "POST",
                body: JSON.stringify({ idproducto, cantidadingreso })
            });

            document.getElementById("form-ingreso-stock").reset();

            mostrarMensaje(
                `${datos.mensaje}. Stock actual: ${datos.stock_actual}`
            );

            await cargarProductos();
            await cargarStock();

        } catch (error) {
            mostrarMensaje(error.message, "danger");
        }
    });

    // =========================
    // PROMOCIONES
    // =========================

    const cargarPromociones = async () => {
        try {
            if (productos.length === 0) {
                const datosProductos = await peticion("/admin/productos");
                productos = datosProductos.productos || [];
                cargarSelectoresProductos();
            }

            const datos = await peticion("/admin/promos");
            promociones = datos.promociones || [];

            const tabla = document.getElementById("tabla-promociones");

            if (promociones.length === 0) {
                tabla.innerHTML = `<tr><td colspan="6">No hay promociones registradas.</td></tr>`;
                return;
            }

            tabla.innerHTML = promociones.map(p => {
                const complementario = p.producto_complementario
                    ? ` + ${escapar(p.producto_complementario)}`
                    : "";

                return `
                    <tr>
                        <td>${escapar(p.id)}</td>
                        <td>
                            <strong>${escapar(p.nombre)}</strong>
                            <small class="d-block">${escapar(p.descripcion)}</small>
                        </td>
                        <td>${escapar(p.producto)}${complementario}</td>
                        <td>${escapar(p.valordescuento)}%</td>
                        <td>${fecha(p.fechainicio)} al ${fecha(p.fechafin)}</td>
                        <td>
                            <div class="admin-acciones">
                                <button class="btn-tabla" data-editar-promo="${p.id}">
                                    Editar
                                </button>
                                <button class="btn-tabla btn-tabla-peligro"
                                        data-eliminar-promo="${p.id}">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");

        } catch (error) {
            mostrarMensaje(`No se pudieron cargar las promociones: ${error.message}`, "danger");
        }
    };

    document.getElementById("nueva-promocion").addEventListener("click", () => {
        document.getElementById("form-promocion").reset();
        document.getElementById("promocion-id").value = "";
        document.getElementById("titulo-modal-promocion").textContent = "Nueva promoción";
        abrirModal("modal-promocion");
    });

    document.getElementById("tabla-promociones").addEventListener("click", async event => {
        const editar = event.target.closest("[data-editar-promo]");
        const eliminar = event.target.closest("[data-eliminar-promo]");

        try {
            if (editar) {
                const id = Number(editar.dataset.editarPromo);
                const p = promociones.find(item => Number(item.id) === id);

                if (!p) return;

                document.getElementById("promocion-id").value = p.id;
                document.getElementById("promo-nombre").value = p.nombre;
                document.getElementById("promo-descripcion").value = p.descripcion;
                document.getElementById("promo-producto").value = p.idproducto;
                document.getElementById("promo-complementario").value =
                    p.idproducto_complementario || "";
                document.getElementById("promo-cantidad").value =
                    p.cantidad_producto ?? "";
                document.getElementById("promo-descuento").value = p.valordescuento;
                document.getElementById("promo-inicio").value =
                    String(p.fechainicio).slice(0, 10);
                document.getElementById("promo-fin").value =
                    String(p.fechafin).slice(0, 10);
                document.getElementById("promo-imagen").value = p.imagen || "";

                document.getElementById("titulo-modal-promocion").textContent =
                    "Editar promoción";

                abrirModal("modal-promocion");
            }

            if (eliminar) {
                const id = eliminar.dataset.eliminarPromo;

                if (!confirm("¿Seguro que querés eliminar esta promoción?")) {
                    return;
                }

                const datos = await peticion(`/admin/promos/${id}`, {
                    method: "DELETE"
                });

                mostrarMensaje(datos.mensaje || "Promoción eliminada.");
                await cargarPromociones();
            }

        } catch (error) {
            mostrarMensaje(error.message, "danger");
        }
    });

    document.getElementById("form-promocion").addEventListener("submit", async event => {
        event.preventDefault();

        const id = document.getElementById("promocion-id").value;
        const complementario = document.getElementById("promo-complementario").value;

        const promocion = {
            nombre: document.getElementById("promo-nombre").value.trim(),
            descripcion: document.getElementById("promo-descripcion").value.trim(),
            idproducto: Number(document.getElementById("promo-producto").value),
            idproducto_complementario: complementario ? Number(complementario) : null,
            cantidad_producto: document.getElementById("promo-cantidad").value
                ? Number(document.getElementById("promo-cantidad").value)
                : null,
            valordescuento: Number(document.getElementById("promo-descuento").value),
            fechainicio: document.getElementById("promo-inicio").value,
            fechafin: document.getElementById("promo-fin").value,
            imagen: document.getElementById("promo-imagen").value.trim() || null
        };

        if (
            promocion.idproducto_complementario &&
            promocion.idproducto === promocion.idproducto_complementario
        ) {
            mostrarMensaje("El producto complementario debe ser diferente al principal.", "warning");
            return;
        }

        if (promocion.fechafin < promocion.fechainicio) {
            mostrarMensaje("La fecha de finalización no puede ser anterior al inicio.", "warning");
            return;
        }

        try {
            const datos = await peticion(
                id ? `/admin/promos/${id}` : "/admin/promos",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(promocion)
                }
            );

            cerrarModal("modal-promocion");
            mostrarMensaje(datos.mensaje || "Promoción guardada correctamente.");
            await cargarPromociones();

        } catch (error) {
            mostrarMensaje(error.message, "danger");
        }
    });

    // =========================
    // COMPRAS Y VENTAS
    // =========================

    const cargarCompras = async () => {
        try {
            const datos = await peticion("/admin/compras");
            compras = datos.compras || [];
            filtrarCompras();

        } catch (error) {
            mostrarMensaje(`No se pudieron cargar las compras: ${error.message}`, "danger");
        }
    };

    const filtrarCompras = () => {
        const estado = document.getElementById("filtro-estado-compra").value;
        const fechaElegida = document.getElementById("filtro-fecha-compra").value;

        const filtradas = compras.filter(c => {
            const coincideEstado = !estado || c.estado === estado;
            const coincideFecha = !fechaElegida ||
                String(c.fecha).slice(0, 10) === fechaElegida;

            return coincideEstado && coincideFecha;
        });

        const tabla = document.getElementById("tabla-compras");

        if (filtradas.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6">No se encontraron compras.</td></tr>`;
            return;
        }

        tabla.innerHTML = filtradas.map(c => `
            <tr>
                <td>#${escapar(c.id_compra)}</td>
                <td>
                    ${escapar(c.nombre)} ${escapar(c.apellido)}
                    <small class="d-block">${escapar(c.correo)}</small>
                </td>
                <td>${fecha(c.fecha)}</td>
                <td>
                    <span class="admin-estado ${c.estado === "pagada" ? "estado-activo" : "estado-pendiente"}">
                        ${escapar(c.estado)}
                    </span>
                </td>
                <td>${dinero(c.total)}</td>
                <td>
                    <button class="btn-tabla" data-detalle-compra="${c.id_compra}">
                        Ver detalle
                    </button>
                </td>
            </tr>
        `).join("");
    };

    document.getElementById("filtro-estado-compra").addEventListener("change", filtrarCompras);
    document.getElementById("filtro-fecha-compra").addEventListener("change", filtrarCompras);

    document.getElementById("limpiar-filtros-compras").addEventListener("click", () => {
        document.getElementById("filtro-estado-compra").value = "";
        document.getElementById("filtro-fecha-compra").value = "";
        filtrarCompras();
    });

    document.getElementById("tabla-compras").addEventListener("click", async event => {
        const boton = event.target.closest("[data-detalle-compra]");
        if (!boton) return;

        try {
            const datos = await peticion(`/admin/compras/${boton.dataset.detalleCompra}`);
            const c = datos.compra;
            const lista = datos.productos || [];

            document.getElementById("detalle-compra").innerHTML = `
                <div class="mb-3">
                    <p><strong>Compra:</strong> #${escapar(c.id_compra)}</p>
                    <p><strong>Cliente:</strong> ${escapar(c.nombre)} ${escapar(c.apellido)}</p>
                    <p><strong>Correo:</strong> ${escapar(c.correo)}</p>
                    <p><strong>Fecha:</strong> ${fecha(c.fecha)}</p>
                    <p><strong>Estado:</strong> ${escapar(c.estado)}</p>
                    <p><strong>Total:</strong> ${dinero(c.total)}</p>
                </div>

                <h3>Productos comprados</h3>

                <div class="table-responsive">
                    <table class="table admin-tabla">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Unidades</th>
                                <th>Precio unitario</th>
                                <th>Descuento</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lista.map(p => `
                                <tr>
                                    <td>${escapar(p.nombre)}</td>
                                    <td>${escapar(p.unidades)}</td>
                                    <td>${dinero(p.preciounitario)}</td>
                                    <td>${escapar(p.descuento)}%</td>
                                    <td>${dinero(p.subtotal)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;

            abrirModal("modal-compra");

        } catch (error) {
            mostrarMensaje(error.message, "danger");
        }
    });

    // Inicio
    verificarAdministrador().then(esAdmin => {
        if (!esAdmin) return;
        cargarEstadisticas();
    });
});
