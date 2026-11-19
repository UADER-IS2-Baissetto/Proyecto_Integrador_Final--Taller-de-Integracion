
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-login");
    const mensaje = document.getElementById("mensaje-login");
    const botonVisitante = document.getElementById("continuar-visitante");
    const botonSalir = document.getElementById("cerrar-sesion");

    formulario.addEventListener("submit", async (event) => {
        event.preventDefault();

        mensaje.textContent = "";
        mensaje.className = "text-center mb-3";

        const correo = document.getElementById("correo").value.trim();
        const contrasena = document.getElementById("contrasena").value;

        try {
            const respuesta = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    correo,
                    contrasena
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.mensaje || "No se pudo iniciar sesión");
            }

            localStorage.setItem("token", datos.token);
            localStorage.setItem("usuario", JSON.stringify(datos.usuario));

            window.location.href = "perfil.html";

        } catch (error) {
            mensaje.textContent = error.message;
            mensaje.classList.add("text-danger");
        }
    });

    botonVisitante.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    botonSalir.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "index.html";
    });
});
