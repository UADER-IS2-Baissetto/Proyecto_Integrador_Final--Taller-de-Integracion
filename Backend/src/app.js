
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productosRoutes = require("./routes/productos");
const promosRoutes = require("./routes/promos");
const carritoRoutes = require("./routes/carrito");
const comprasRoutes = require("./routes/compras");
const webhooksRoutes = require("./routes/webhooks");
const favoritosRoutes = require("./routes/favoritos");
const resenasRoutes = require("./routes/reseñas");
const adminRoutes = require("./routes/admin");

const verificarToken = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta principal
app.get("/", (req, res) => {
    res.json({
        mensaje: "Backend de Amargo y Dulce funcionando"
    });
});

// Rutas públicas
app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/promos", promosRoutes);
app.use("/api/resenas", resenasRoutes);

// Webhooks públicos
app.use("/api/webhooks", webhooksRoutes);

// Rutas protegidas: requieren JWT
app.use("/api/favoritos", verificarToken, favoritosRoutes);
app.use("/api/carrito", verificarToken, carritoRoutes);
app.use("/api/compras", verificarToken, comprasRoutes);

// Rutas administrativas: requieren JWT y rol admin
app.use("/api/admin", verificarToken, adminRoutes);

module.exports = app;
