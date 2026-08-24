const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();

// Permitir conexiones desde el frontend
app.use(cors());

// Permitir recibir JSON
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
    res.json({
        mensaje: "Backend de Amargo y Dulce funcionando"
    });
});

// Rutas
app.use("/api/auth", authRoutes);

module.exports = app;