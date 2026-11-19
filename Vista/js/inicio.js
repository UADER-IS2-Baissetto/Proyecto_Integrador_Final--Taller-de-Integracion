
const API_URL = "http://localhost:3000/api";

let productosCargados = [];

const filtrosActivos = {
    precio: "",
    disponibilidad: "",
    sabor: "",
    especial: ""
};

// Escapa los valores antes de insertarlos en HTML.
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

// Obtiene el sabor sin la cantidad de unidades.
function obtenerSabor(producto) {
    const sabor = String(producto.sabor || "").trim();

    if (sabor) {
        return sabor.replace(/\s+\d+\s*$/, "").trim().toLowerCase();
    }

    // Alternativa si el backend no devuelve el campo sabor.
    return String(producto.nombre || "")
        .replace(/\s+\d+\s*$/, "")
        .trim()
        .toLowerCase();
}

// Obtiene la ruta de una imagen.
function obtenerRutaImagen(ruta) {
    if (!ruta) return "";

    return `Assets/${String(ruta).replace(/^\/+/, "")}`;
}

// Formatea los precios.
function formatearPrecio(precio) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
    }).format(Number(precio) || 0);
}

// Carga los productos desde PostgreSQL.
async function cargarProductos() {
    const contenedor = document.getElementById("contenedor-productos");

    if (!contenedor) return;

    try {
        const respuesta = await fetch(`${API_URL}/productos`);

        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener los productos.");
        }

        const datos = await respuesta.json();

        productosCargados = datos.productos || [];

        cargarOpcionesSabores();
        aplicarFiltros();

    } catch (error) {
        console.error("Error al cargar productos:", error);

        contenedor.innerHTML = `
            <div class="col-12 text-center">
                <p>No se pudieron cargar los productos.</p>
            </div>
        `;
    }
}

// Carga los sabores disponibles.
function cargarOpcionesSabores() {
    const contenedor = document.getElementById("opciones-sabores");

    if (!contenedor) return;

    const sabores = [
        ...new Set(
            productosCargados.map(producto => obtenerSabor(producto))
                .filter(Boolean)
        )
    ];

    contenedor.innerHTML = `
        <li>
            <button class="dropdown-item"
                    data-filtro="sabor"
                    data-valor="">
                Todos los sabores
            </button>
        </li>

        ${sabores.map(sabor => `
            <li>
                <button class="dropdown-item"
                        data-filtro="sabor"
                        data-valor="${escaparHTML(sabor)}">
                    ${escaparHTML(sabor)}
                </button>
            </li>
        `).join("")}
    `;
}

// Aplica todos los filtros seleccionados.
function aplicarFiltros() {
    let productosFiltrados = [...productosCargados];

    // Disponibilidad.
    if (filtrosActivos.disponibilidad === "disponible") {
        productosFiltrados = productosFiltrados.filter(
            producto =>
                producto.disponibilidad === true &&
                Number(producto.stock) > 0
        );
    }

    if (filtrosActivos.disponibilidad === "agotado") {
        productosFiltrados = productosFiltrados.filter(
            producto =>
                producto.disponibilidad === false ||
                Number(producto.stock) <= 0
        );
    }

    // Sabor.
    if (filtrosActivos.sabor) {
        productosFiltrados = productosFiltrados.filter(
            producto => obtenerSabor(producto) === filtrosActivos.sabor
        );
    }

    // Edición especial.
    if (filtrosActivos.especial === "si") {
        productosFiltrados = productosFiltrados.filter(
            producto => producto.edicionespecial === true
        );
    }

    if (filtrosActivos.especial === "no") {
        productosFiltrados = productosFiltrados.filter(
            producto => producto.edicionespecial === false
        );
    }

    // Orden por precio.
    if (filtrosActivos.precio === "menor") {
        productosFiltrados.sort(
            (a, b) => Number(a.precio) - Number(b.precio)
        );
    }

    if (filtrosActivos.precio === "mayor") {
        productosFiltrados.sort(
            (a, b) => Number(b.precio) - Number(a.precio)
        );
    }

    mostrarProductos(productosFiltrados);
}

// Genera las tarjetas.
function mostrarProductos(productos) {
    const contenedor = document.getElementById("contenedor-productos");

    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (productos.length === 0) {
        contenedor.innerHTML = `
            <div class="col-12 text-center">
                <p>No se encontraron productos con esos filtros.</p>
            </div>
        `;
        return;
    }

    productos.forEach(producto => {
        const tarjeta = document.createElement("div");

        tarjeta.className =
            "col-xl-3 col-md-4 col-6 align-self-center fondo-oscuro rounded-5 mb-4 tarjeta-producto";

        const imagen = obtenerRutaImagen(producto.imagen);
        const nombre = escaparHTML(producto.nombre);
        const precio = formatearPrecio(producto.precio);
        const id = encodeURIComponent(producto.id);

        const sinStock =
            producto.disponibilidad !== true ||
            Number(producto.stock) <= 0;

        tarjeta.innerHTML = `
            <img
                class="img-fluid imagen-producto"
                src="${escaparHTML(imagen)}"
                alt="${nombre}"
                onerror="this.style.display='none'"
            >

            <h3 class="card-title lobster fw-bold text-center nombre-producto">
                ${nombre}
            </h3>

            <div class="row mt-2 mb-3">
                <div class="col text-center align-self-center">
                    <h4 class="text-white">${precio}</h4>
                    ${sinStock ? '<p class="text-white">Sin stock</p>' : ""}
                </div>

                <div class="col text-center align-self-center">
                    <a
                        href="producto.html?id=${id}"
                        class="btn btn-sm btn-dark text-white lobster rounded-5 text-nowrap"
                    >
                        Saber más
                        <span class="bg-white text-black rounded-circle ms-2 ps-1">▶</span>
                    </a>
                </div>
            </div>
        `;

        contenedor.appendChild(tarjeta);
    });
}

// Carga las promociones.
async function cargarPromociones() {
    const contenedor = document.getElementById("contenedor-promociones");

    if (!contenedor) return;

    try {
        const respuesta = await fetch(`${API_URL}/promos`);

        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener las promociones.");
        }

        const datos = await respuesta.json();
        const promociones = datos.promociones || [];

        contenedor.innerHTML = "";

        // Evita repetir una misma campaña y sabor.
        const promocionesUnicas = [];

        promociones.forEach(promo => {
            const yaExiste = promocionesUnicas.some(
                existente =>
                    existente.nombre === promo.nombre &&
                    existente.sabor === promo.sabor
            );

            if (!yaExiste) {
                promocionesUnicas.push(promo);
            }
        });

        if (promocionesUnicas.length === 0) {
            contenedor.innerHTML = `
                <div class="carousel-item active">
                    <div class="row">
                        <div class="col promo lado-a">
                            <h1 class="display-4 lobster fw-bold text-black ms-4">
                                No hay promociones vigentes
                            </h1>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        promocionesUnicas.forEach((promo, indice) => {
            const elemento = document.createElement("div");

            elemento.className =
                `carousel-item${indice === 0 ? " active" : ""}`;

            const nombre = escaparHTML(promo.nombre || "Promoción");
            const descripcion = escaparHTML(promo.descripcion || "");
            const imagen = obtenerRutaImagen(promo.imagen);

            elemento.innerHTML = `
                <div class="row">
                    <div class="col promo lado-a">
                        <div class="row">

                            <div class="col-xl-5 col-lg-5 col-md-6 col-sm-7 col-9">
                                <h3 class="text-white lobster rojo text-center rounded-4 mt-4 ms-4">
                                    Promoción
                                </h3>
                            </div>

                            <div class="w-100"></div>

                            <div class="col">
                                <h1 class="display-4 lobster fw-bold text-black ms-4">
                                    ${nombre}
                                </h1>
                            </div>

                            <div class="w-100"></div>

                            <div class="col">
                                <p class="marron-oscuro ms-4">
                                    ${descripcion}
                                </p>
                            </div>

                        </div>
                    </div>

                    <div class="col lado-b align-self-center">
                        <img
                            src="${escaparHTML(imagen)}"
                            class="img-fluid"
                            alt="${nombre}"
                            onerror="this.style.display='none'"
                        >
                    </div>
                </div>
            `;

            contenedor.appendChild(elemento);
        });

        const carrusel = document.getElementById("carousel1");

        if (carrusel && window.bootstrap) {
            const instancia =
                bootstrap.Carousel.getOrCreateInstance(carrusel);

            instancia.to(0);
        }

    } catch (error) {
        console.error("Error al cargar promociones:", error);

        contenedor.innerHTML = `
            <div class="carousel-item active">
                <div class="row">
                    <div class="col promo lado-a">
                        <h1 class="display-4 lobster fw-bold text-black ms-4">
                            No se pudieron cargar las promociones
                        </h1>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicialización.
document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-filtro]").forEach(boton => {
        boton.addEventListener("click", () => {
            const filtro = boton.dataset.filtro;
            const valor = boton.dataset.valor;

            if (Object.hasOwn(filtrosActivos, filtro)) {
                filtrosActivos[filtro] = valor;
                aplicarFiltros();
            }
        });
    });

    document.getElementById("limpiar-filtros")
        ?.addEventListener("click", () => {

            Object.keys(filtrosActivos).forEach(filtro => {
                filtrosActivos[filtro] = "";
            });

            aplicarFiltros();
        });

    cargarProductos();
    cargarPromociones();
});
