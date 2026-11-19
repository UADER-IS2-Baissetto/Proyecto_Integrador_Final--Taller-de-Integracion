
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-registro");
    const mensaje = document.getElementById("mensaje-registro");

    formulario.addEventListener("submit", async (event) => {
        event.preventDefault();

        mensaje.textContent = "";
        mensaje.className = "text-center mb-3";

        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const correo = document.getElementById("correo").value.trim();
        const direccion = document.getElementById("direccion").value.trim();
        const contrasena = document.getElementById("contrasena").value;
        const repetirContrasena = document.getElementById("repetir-contrasena").value;

        if (contrasena !== repetirContrasena) {
            mensaje.textContent = "Las contraseñas no coinciden";
            mensaje.classList.add("text-danger");
            return;
        }

        if (contrasena.length < 8 || contrasena.length > 30) {
            mensaje.textContent = "La contraseña debe tener entre 8 y 30 caracteres";
            mensaje.classList.add("text-danger");
            return;
        }

        try {
            const respuesta = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nombre,
                    apellido,
                    correo,
                    direccion,
                    contrasena
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.mensaje || "No se pudo completar el registro");
            }

            mensaje.textContent = "Cuenta creada correctamente. Redirigiendo al login...";
            mensaje.classList.add("text-success");

            formulario.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

        } catch (error) {
            mensaje.textContent = error.message;
            mensaje.classList.add("text-danger");
        }
    });
});
