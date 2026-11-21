
const API_URL = "http://localhost:3000/api";

let productosCarrito = [];
let imagenesProductos = {};
let procesandoCompra = false;

function formatearPrecio(precio) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2
    }).format(Number(precio) || 0);
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => {
        const caracteres = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return caracteres[caracter];
    });
}

function obtenerToken() {
    return localStorage.getItem("token");
}

function mostrarMensaje(texto, tipo = "danger") {
    const contenedor = document.getElementById("mensaje-carrito");

    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="alert alert-${tipo}" role="alert">
            ${escaparHTML(texto)}
        </div>
    `;
}

async function solicitarAPI(endpoint, opciones = {}) {
    const token = obtenerToken();

    if (!token) {
        throw new Error("Necesitás iniciar sesión para utilizar el carrito.");
    }

    const respuesta = await fetch(`${API_URL}${endpoint}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(opciones.headers || {})
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        if (respuesta.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            throw new Error("Tu sesión venció. Iniciá sesión nuevamente.");
        }

        throw new Error(datos.mensaje || "No se pudo completar la operación.");
    }

    return datos;
}

async function cargarImagenesProductos() {
    try {
        const respuesta = await fetch(`${API_URL}/productos`);

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        (datos.productos || []).forEach(producto => {
            imagenesProductos[producto.id] = producto.imagen;
        });
    } catch (error) {
        console.error("No se pudieron cargar las imágenes:", error);
    }
}

function obtenerRutaImagen(idProducto) {
    const ruta = imagenesProductos[idProducto];

    if (!ruta) {
        return "Assets/Bananero_de_chocolate_PNG-removebg-preview.png";
    }

    return `Assets/${String(ruta).replace(/^\/+/, "")}`;
}

async function cargarCarrito() {
    const contenedor = document.getElementById("contenedor-carrito");
    const botonFinalizar = document.getElementById("btn-finalizar-compra");

    if (!contenedor || !botonFinalizar) return;

    if (!obtenerToken()) {
        contenedor.innerHTML = `
            <div class="mensaje-vacio">
                <h3 class="lobster">Iniciá sesión para ver tu carrito</h3>
                <p>Necesitás una cuenta para guardar y comprar productos.</p>
                <a href="login.html" class="btn btn-dark rounded-5">
                    Iniciar sesión
                </a>
                <a href="registro.html" class="btn btn-volver-productos rounded-5 ms-2">
                    Registrarme
                </a>
            </div>
        `;

        productosCarrito = [];
        actualizarResumen(0, 0, 0);
        botonFinalizar.disabled = true;
        return;
    }

    contenedor.innerHTML = `<p class="text-center">Cargando carrito...</p>`;

    try {
        await cargarImagenesProductos();

        const datos = await solicitarAPI("/carrito");

        productosCarrito = datos.productos || [];

        mostrarProductosCarrito();
        actualizarResumenDesdeDatos(datos);

    } catch (error) {
        console.error("Error al cargar el carrito:", error);

        contenedor.innerHTML = `
            <div class="mensaje-vacio">
                <h3 class="lobster">No se pudo cargar el carrito</h3>
                <p>${escaparHTML(error.message)}</p>
                ${
                    error.message.toLowerCase().includes("sesión")
                        ? `<a href="login.html" class="btn btn-dark rounded-5">Iniciar sesión</a>`
                        : `<button class="btn btn-dark rounded-5" id="btn-reintentar-carrito">Reintentar</button>`
                }
            </div>
        `;

        actualizarResumen(0, 0, 0);
        botonFinalizar.disabled = true;

        document.getElementById("btn-reintentar-carrito")
            ?.addEventListener("click", cargarCarrito);
    }
}

function productoDisponible(producto) {
    return producto.disponibilidad === true &&
        Number(producto.stock) >= Number(producto.unidades);
}

function mostrarProductosCarrito() {
    const contenedor = document.getElementById("contenedor-carrito");

    if (!contenedor) return;

    if (productosCarrito.length === 0) {
        contenedor.innerHTML = `
            <div class="mensaje-vacio">
                <h3 class="lobster">Tu carrito está vacío</h3>
                <p>Todavía no agregaste ningún producto.</p>
                <a href="index.html" class="btn btn-dark rounded-5">
                    Ver productos
                </a>
            </div>
        `;

        return;
    }

    contenedor.innerHTML = productosCarrito.map(producto => {
        const idItem = Number(producto.id_item);
        const unidades = Number(producto.unidades);
        const precioUnitario = Number(producto.precio_unitario);
        const subtotal = Number(producto.subtotal);
        const precioSinDescuento = precioUnitario * unidades;
        const descuento = Math.max(0, precioSinDescuento - subtotal);
        const disponible = productoDisponible(producto);
        const stock = Number(producto.stock);

        let mensajeDisponibilidad = "";

        if (!producto.disponibilidad || stock <= 0) {
            mensajeDisponibilidad = `
                <p class="producto-agotado mb-2">
                    Producto sin disponibilidad. Retiralo para continuar.
                </p>
            `;
        } else if (unidades > stock) {
            mensajeDisponibilidad = `
                <p class="producto-agotado mb-2">
                    Solo quedan ${stock} unidades. Reducí la cantidad o retiralo.
                </p>
            `;
        } else if (stock <= 5) {
            mensajeDisponibilidad = `
                <p class="producto-agotado mb-2">
                    ¡Quedan pocas unidades! Stock: ${stock}
                </p>
            `;
        } else {
            mensajeDisponibilidad = `
                <p class="producto-disponible mb-2">Disponible</p>
            `;
        }

        const puedeAumentar =
            producto.disponibilidad === true &&
            unidades < stock;

        const puedeDisminuir =
            unidades > 1;

        return `
            <article class="item-carrito">
                <div class="row g-3 align-items-center">

                    <div class="col-4 col-md-4">
                        <img
                            class="imagen-carrito"
                            src="${escaparHTML(obtenerRutaImagen(producto.idproducto))}"
                            alt="${escaparHTML(producto.nombre)}"
                            onerror="this.src='Assets/Bananero_de_chocolate_PNG-removebg-preview.png'"
                        >
                    </div>

                    <div class="col-8 col-md-8 datos-carrito">

                        <h4 class="lobster fw-bold">
                            ${escaparHTML(producto.nombre)}
                        </h4>

                        <p class="mb-1">
                            Sabor: ${escaparHTML(producto.sabor || "No especificado")}
                        </p>

                        <p class="mb-1">
                            Presentación: ${Number(producto.bombones_por_caja)} bombones
                        </p>

                        <p class="mb-2">
                            Precio por caja: ${formatearPrecio(precioUnitario)}
                        </p>

                        ${mensajeDisponibilidad}

                        <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                            <span class="fw-bold">Cantidad:</span>

                            <button
                                class="boton-cantidad"
                                type="button"
                                data-accion="disminuir"
                                data-id="${idItem}"
                                ${!puedeDisminuir ? "disabled" : ""}
                                aria-label="Disminuir cantidad"
                            >-</button>

                            <span class="cantidad-carrito">${unidades}</span>

                            <button
                                class="boton-cantidad"
                                type="button"
                                data-accion="aumentar"
                                data-id="${idItem}"
                                ${!puedeAumentar ? "disabled" : ""}
                                aria-label="Aumentar cantidad"
                            >+</button>
                        </div>

                        ${
                            descuento > 0
                                ? `
                                    <p class="mb-1">
                                        <span class="precio-anterior">
                                            ${formatearPrecio(precioSinDescuento)}
                                        </span>
                                    </p>
                                    <p class="fw-bold">
                                        Descuento: -${formatearPrecio(descuento)}
                                    </p>
                                `
                                : ""
                        }

                        <h5 class="fw-bold">
                            Subtotal: ${formatearPrecio(subtotal)}
                        </h5>

                        <button
                            class="boton-eliminar mt-2"
                            type="button"
                            data-accion="eliminar"
                            data-id="${idItem}"
                        >
                            🗑️ Eliminar
                        </button>

                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function actualizarResumen(subtotal, descuentos, total) {
    document.getElementById("subtotal-carrito").textContent =
        formatearPrecio(subtotal);

    document.getElementById("descuentos-carrito").textContent =
        `-${formatearPrecio(descuentos)}`;

    document.getElementById("total-carrito").textContent =
        formatearPrecio(total);
}

function actualizarResumenDesdeDatos(datos) {
    const subtotal = productosCarrito.reduce((acumulado, producto) => {
        return acumulado +
            Number(producto.precio_unitario) * Number(producto.unidades);
    }, 0);

    const total = Number(datos.total) || 0;
    const descuentos = Math.max(0, subtotal - total);

    actualizarResumen(subtotal, descuentos, total);

    const hayProductos = productosCarrito.length > 0;

    const hayProductosNoDisponibles = productosCarrito.some(
        producto => !productoDisponible(producto)
    );

    const boton = document.getElementById("btn-finalizar-compra");
    const aviso = document.getElementById("aviso-disponibilidad");

    boton.disabled =
        !hayProductos ||
        hayProductosNoDisponibles ||
        procesandoCompra;

    if (!hayProductos) {
        aviso.innerHTML = `
            <p class="text-center">
                Agregá productos para comenzar tu compra.
            </p>
        `;
    } else if (hayProductosNoDisponibles) {
        aviso.innerHTML = `
            <div class="alert alert-danger">
                Hay productos sin disponibilidad o con stock insuficiente.
                Retiralos o ajustá sus cantidades para poder comprar.
            </div>
        `;
    } else {
        aviso.innerHTML = `
            <div class="alert alert-success">
                Todos los productos de tu carrito tienen disponibilidad.
            </div>
        `;
    }
}

async function modificarCantidad(idItem, unidades) {
    try {
        await solicitarAPI(`/carrito/items/${idItem}`, {
            method: "PUT",
            body: JSON.stringify({ unidades })
        });

        await cargarCarrito();
        mostrarMensaje("Cantidad actualizada correctamente.", "success");

    } catch (error) {
        mostrarMensaje(error.message);
    }
}

async function eliminarProducto(idItem) {
    const confirmar = window.confirm(
        "¿Querés retirar este producto de tu carrito?"
    );

    if (!confirmar) return;

    try {
        await solicitarAPI(`/carrito/items/${idItem}`, {
            method: "DELETE"
        });

        await cargarCarrito();
        mostrarMensaje("Producto eliminado del carrito.", "success");

    } catch (error) {
        mostrarMensaje(error.message);
    }
}

async function finalizarCompra() {
    if (procesandoCompra) return;

    if (!obtenerToken()) {
        window.location.href = "login.html";
        return;
    }

    if (productosCarrito.length === 0) {
        mostrarMensaje("Tu carrito está vacío.");
        return;
    }

    const hayProductosNoDisponibles = productosCarrito.some(
        producto => !productoDisponible(producto)
    );

    if (hayProductosNoDisponibles) {
        mostrarMensaje(
            "No podés continuar porque hay productos sin disponibilidad o con stock insuficiente."
        );
        return;
    }

    const confirmar = window.confirm(
        "¿Querés confirmar la compra y continuar a Mercado Pago?"
    );

    if (!confirmar) return;

    const boton = document.getElementById("btn-finalizar-compra");

    try {
        procesandoCompra = true;
        boton.disabled = true;
        boton.textContent = "Preparando compra...";

        mostrarMensaje("Estamos confirmando tu compra...", "info");

        // Primero se confirma la compra desde el carrito.
        const confirmacion = await solicitarAPI("/carrito/confirmar", {
            method: "POST"
        });

        const idCompra = confirmacion.compra?.id;

        if (!idCompra) {
            throw new Error("El servidor no devolvió el número de compra.");
        }

        mostrarMensaje(
            "Compra confirmada. Estamos conectando con Mercado Pago...",
            "info"
        );

        // Luego se crea la orden de pago para esa compra.
        const pago = await solicitarAPI(`/compras/${idCompra}/pagar`, {
            method: "POST"
        });

        if (!pago.checkout_url) {
            throw new Error(
                "La compra se confirmó, pero Mercado Pago no devolvió el enlace de pago."
            );
        }

        // Redirige al checkout de Mercado Pago.
        window.location.href = pago.checkout_url;

    } catch (error) {
        console.error("Error al finalizar la compra:", error);

        mostrarMensaje(error.message);

        procesandoCompra = false;
        boton.disabled = false;
        boton.textContent = "Finalizar compra";

        // Si la compra ya se confirmó, el carrito puede haberse vaciado.
        // Se vuelve a consultar para mostrar el estado real.
        await cargarCarrito();
    }
}

function configurarEventosCarrito() {
    const contenedor = document.getElementById("contenedor-carrito");
    const botonFinalizar = document.getElementById("btn-finalizar-compra");

    if (!contenedor || !botonFinalizar) return;

    contenedor.addEventListener("click", async event => {
        const boton = event.target.closest("button[data-accion]");

        if (!boton) return;

        const idItem = Number(boton.dataset.id);
        const accion = boton.dataset.accion;

        const producto = productosCarrito.find(
            item => Number(item.id_item) === idItem
        );

        if (!producto) return;

        const unidadesActuales = Number(producto.unidades);

        if (accion === "aumentar") {
            await modificarCantidad(idItem, unidadesActuales + 1);
        }

        if (accion === "disminuir") {
            await modificarCantidad(idItem, unidadesActuales - 1);
        }

        if (accion === "eliminar") {
            await eliminarProducto(idItem);
        }
    });

    botonFinalizar.addEventListener("click", finalizarCompra);
}

document.addEventListener("DOMContentLoaded", () => {
    configurarEventosCarrito();
    cargarCarrito();
});
