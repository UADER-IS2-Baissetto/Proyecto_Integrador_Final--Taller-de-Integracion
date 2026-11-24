document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    document.querySelectorAll("nav a").forEach(enlace => {
        const texto = enlace.textContent.trim().toLowerCase();

        // Acceso al perfil.
        if (texto === "tu perfil" || texto === "mi perfil") {
            enlace.textContent = "Mi perfil";
            enlace.href = token ? "perfil.html" : "login.html";
        }

        // Acceso a la página Nosotros.
        if (texto === "nosotros") {
            enlace.href = "nosotros.html";
        }

        // Cierre de sesión.
        // Se identifica por el texto o por el ID, sin excluir enlaces que tengan ID.
        if (texto === "salir" || enlace.id === "cerrar-sesion") {
            enlace.href = "#";

            enlace.addEventListener("click", event => {
                event.preventDefault();

                localStorage.removeItem("token");
                localStorage.removeItem("usuario");

                window.location.href = "index.html";
            });
        }
    });


    // Mostrar el acceso administrativo únicamente a administradores.
    const usuarioGuardado = localStorage.getItem("usuario");

    if (token && usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);

            if (usuario.rol === "admin") {
                const menu = document.querySelector("#opciones2 ul");

                if (menu && !document.getElementById("enlace-administracion")) {
                    const elemento = document.createElement("li");

                    elemento.innerHTML = `
                        <a class="nav-link lobster fs-5 mb-1"
                           href="admin.html"
                           id="enlace-administracion">
                            Administración
                        </a>
                    `;

                    menu.insertBefore(elemento, menu.lastElementChild);
                }
            }
        } catch (error) {
            console.error("No se pudieron leer los datos del usuario:", error);
        }
    }

});