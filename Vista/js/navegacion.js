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
});