
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    const mensaje = document.getElementById("mensaje-perfil");
    const datosPerfil = document.getElementById("datos-perfil");
    const seccionCompras = document.getElementById("seccion-compras");
    const listaCompras = document.getElementById("lista-compras");

    const botonSalir = document.getElementById("cerrar-sesion");
    const botonSalirPerfil = document.getElementById("cerrar-sesion-perfil");

    const cerrarSesion = (event) => {
        if (event) event.preventDefault();

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.href = "login.html";
    };

    botonSalir.addEventListener("click", cerrarSesion);
    botonSalirPerfil.addEventListener("click", cerrarSesion);

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const escaparHTML = (valor) => {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    };

    const formatearPrecio = (valor) => {
        return Number(valor || 0).toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 2
        });
    };

    const formatearFecha = (valor) => {
        if (!valor) return "No disponible";

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return escaparHTML(valor);
        }

        return fecha.toLocaleDateString("es-AR");
    };

    const cargarPerfil = async () => {
        try {
            const respuestaPerfil = await fetch(`${API_URL}/auth/perfil`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const datos = await respuestaPerfil.json();

            if (!respuestaPerfil.ok) {
                throw new Error(datos.mensaje || "No se pudo cargar el perfil");
            }

            const usuario = datos.usuario;

            document.getElementById("perfil-nombre").textContent = usuario.nombre || "";
            document.getElementById("perfil-apellido").textContent = usuario.apellido || "";
            document.getElementById("perfil-correo").textContent = usuario.correo || "";
            document.getElementById("perfil-direccion").textContent =
                usuario.direccion || "Sin dirección registrada";

            datosPerfil.hidden = false;
            mensaje.textContent = "";

            await cargarCompras();

        } catch (error) {
            console.error(error);

            mensaje.textContent = error.message;
            mensaje.className = "text-center mt-3 text-danger";

            if (
                error.message.includes("Token") ||
                error.message.includes("autenticado") ||
                error.message.includes("inválido") ||
                error.message.includes("expirado")
            ) {
                localStorage.removeItem("token");
                localStorage.removeItem("usuario");

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            }
        }
    };

    const cargarCompras = async () => {
        try {
            const respuesta = await fetch(`${API_URL}/compras`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.mensaje || "No se pudo cargar el historial");
            }

            const compras = datos.compras || [];

            seccionCompras.hidden = false;

            if (compras.length === 0) {
                listaCompras.innerHTML = `
                    <p class="text-center lobster">
                        Todavía no realizaste compras.
                    </p>
                `;
                return;
            }

            listaCompras.innerHTML = compras.map((compra) => {
                const id = compra.id_compra ?? compra.id;
                const fecha = compra.fecha;
                const estado = compra.estado || "Sin estado";
                const total = compra.total ?? 0;

                return `
                    <div class="card login mb-3">
                        <div class="card-body lobster">
                            <h5>Compra #${escaparHTML(id)}</h5>
                            <p><strong>Fecha:</strong> ${formatearFecha(fecha)}</p>
                            <p><strong>Estado:</strong> ${escaparHTML(estado)}</p>
                            <p><strong>Total:</strong> ${formatearPrecio(total)}</p>
                        </div>
                    </div>
                `;
            }).join("");

        } catch (error) {
            console.error("Error al cargar compras:", error);

            listaCompras.innerHTML = `
                <p class="text-center text-danger">
                    No se pudo cargar el historial de compras.
                </p>
            `;

            seccionCompras.hidden = false;
        }
    };

    cargarPerfil();
});
