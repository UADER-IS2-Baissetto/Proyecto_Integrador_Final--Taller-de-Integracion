
const API_URL = "http://localhost:3000/api";

let productoActual = null;

// Escapa valores antes de insertarlos en HTML.
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

// Formatea los precios.
function formatearPrecio(precio) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
    }).format(Number(precio) || 0);
}

// Obtiene la imagen del producto.
function obtenerRutaImagen(ruta) {
    if (!ruta) return "";

    return `Assets/${String(ruta).replace(/^\/+/, "")}`;
}

// Genera las estrellas de calificación.
function mostrarCalificacion(calificacion) {
    const contenedor = document.getElementById("calificacion-producto");

    if (!contenedor) return;

    if (calificacion === null || calificacion === undefined || calificacion === "") {
        contenedor.textContent = "Sin calificaciones";
        return;
    }

    const valor = Math.max(0, Math.min(5, Math.round(Number(calificacion))));

    const estrellaLlena = "\u2605\uFE0E";
    const estrellaVacia = "\u2606\uFE0E";

    const estrellas =
        estrellaLlena.repeat(valor) +
        estrellaVacia.repeat(5 - valor);

    contenedor.innerHTML = `
        <span class="estrellas-calificacion" aria-label="${valor} de 5 estrellas">
            ${estrellas}
        </span>
        <span class="numero-calificacion">${valor}/5</span>
    `;
}

// Muestra mensajes.
function mostrarMensajeProducto(texto, tipo = "danger") {
    const contenedor = document.getElementById("mensaje-producto");

    contenedor.innerHTML = `
        <div class="alert alert-${tipo}" role="alert">
            ${escaparHTML(texto)}
        </div>
    `;
}

// Carga un producto según el ID recibido por URL.
async function cargarProducto() {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get("id");

    if (!id || !/^[1-9]\d*$/.test(id)) {
        mostrarError("No se indicó un producto válido.");
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/productos/${encodeURIComponent(id)}`
        );

        if (!respuesta.ok) {
            if (respuesta.status === 404) {
                throw new Error("El producto solicitado no existe.");
            }

            throw new Error("No se pudo obtener el producto.");
        }

        const datos = await respuesta.json();
        const producto = datos.producto;

        if (!producto) {
            throw new Error("No se encontraron los datos del producto.");
        }

        productoActual = producto;

        mostrarProducto(producto);

    } catch (error) {
        console.error("Error al cargar producto:", error);
        mostrarError(error.message);
    }
}

// Completa la página con los datos recibidos.
function mostrarProducto(producto) {
    document.title = `${producto.nombre} - Amargo y Dulce`;

    document.getElementById("nombre-producto").textContent =
        producto.nombre.replace(/\b\w/g, letra => letra.toUpperCase());

    document.getElementById("precio-producto").textContent =
        formatearPrecio(producto.precio);

    document.getElementById("sabor-producto").textContent =
        `Sabor: ${producto.sabor || "No especificado"}`;

    document.getElementById("cantidad-producto").textContent =
        `Presentación: ${producto.cantidad} unidades`;

    const stock = Number(producto.stock) || 0;
    const disponible = producto.disponibilidad === true && stock > 0;

    const textoStock = document.getElementById("stock-producto");

    if (disponible) {
        textoStock.textContent = stock <= 5
            ? `¡Quedan pocas unidades! Stock disponible: ${stock}`
            : `Stock disponible: ${stock}`;
    } else {
        textoStock.textContent = "Producto agotado";
    }

    mostrarCalificacion(producto.calificacion);

    document.getElementById("especial-producto").textContent =
        producto.edicionespecial
            ? "Edición especial"
            : "Edición regular";

    const imagen = document.getElementById("imagen-producto");

    imagen.src = obtenerRutaImagen(producto.imagen);
    imagen.alt = producto.nombre;

    imagen.onerror = () => {
        imagen.style.display = "none";
        console.error("No se pudo cargar la imagen:", imagen.src);
    };

    const cantidadCompra = document.getElementById("cantidad-compra");
    const botonAgregar = document.getElementById("agregar-carrito");

    cantidadCompra.min = 1;
    cantidadCompra.max = stock;
    cantidadCompra.value = disponible ? 1 : 0;
    cantidadCompra.disabled = !disponible;

    botonAgregar.disabled = !disponible;
}

// Agrega el producto al carrito del usuario autenticado.
async function agregarAlCarrito() {
    if (!productoActual) {
        mostrarMensajeProducto("Todavía no se cargó el producto.");
        return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
        mostrarMensajeProducto(
            "Necesitás iniciar sesión para agregar productos al carrito.",
            "warning"
        );

        return;
    }

    const cantidad = Number(
        document.getElementById("cantidad-compra").value
    );

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        mostrarMensajeProducto("Ingresá una cantidad válida.");
        return;
    }

    if (cantidad > Number(productoActual.stock)) {
        mostrarMensajeProducto(
            `No hay suficiente stock. Disponibles: ${productoActual.stock}.`
        );

        return;
    }

    const boton = document.getElementById("agregar-carrito");

    boton.disabled = true;
    boton.textContent = "Agregando...";

    try {
        const respuesta = await fetch(`${API_URL}/carrito/items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                idproducto: productoActual.id,
                unidades: cantidad
            })
        });

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                throw new Error("Tu sesión venció. Iniciá sesión nuevamente.");
            }

            throw new Error(datos.mensaje || "No se pudo agregar el producto.");
        }

        mostrarMensajeProducto(
            "¡Producto agregado correctamente a tu carrito!",
            "success"
        );

        boton.textContent = "¡Agregado!";

        setTimeout(() => {
            boton.textContent = "Agregar al carrito";
            boton.disabled = false;
        }, 1500);

    } catch (error) {
        console.error("Error al agregar al carrito:", error);

        mostrarMensajeProducto(error.message);

        boton.textContent = "Agregar al carrito";
        boton.disabled = false;
    }
}

// Muestra errores en la página.
function mostrarError(mensaje) {
    document.getElementById("nombre-producto").textContent =
        "Producto no disponible";

    document.getElementById("precio-producto").textContent = "";
    document.getElementById("sabor-producto").textContent = "";
    document.getElementById("cantidad-producto").textContent = "";
    document.getElementById("stock-producto").textContent = "";
    document.getElementById("calificacion-producto").textContent = "";
    document.getElementById("especial-producto").textContent = "";

    document.getElementById("imagen-producto").style.display = "none";

    document.getElementById("cantidad-compra").disabled = true;
    document.getElementById("agregar-carrito").disabled = true;

    mostrarMensajeProducto(mensaje);
}

// Inicialización.
document.addEventListener("DOMContentLoaded", () => {
    cargarProducto();

    document.getElementById("agregar-carrito").addEventListener(
        "click",
        agregarAlCarrito
    );
});
