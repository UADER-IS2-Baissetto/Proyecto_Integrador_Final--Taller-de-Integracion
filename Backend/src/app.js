const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productosRoutes = require("./routes/productos");
const carritoRoutes = require("./routes/carrito");
const comprasRoutes = require("./routes/compras");
const webhooksRoutes = require("./routes/webhooks");

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

// Webhooks públicos: se validan mediante firma de Mercado Pago
app.use("/api/webhooks", webhooksRoutes);

// Rutas protegidas: requieren JWT
app.use("/api/carrito", verificarToken, carritoRoutes);
app.use("/api/compras", verificarToken, comprasRoutes);

module.exports = app;