
const express = require("express");
const router = express.Router();

const {
    obtenerResenasProducto,
    crearResena
} = require("../controllers/reseñaController");

const verificarToken = require("../middleware/auth");

// Consultar reseñas: no requiere iniciar sesión
router.get("/producto/:idproducto", obtenerResenasProducto);

// Publicar reseña: requiere iniciar sesión
router.post("/", verificarToken, crearResena);

module.exports = router;
