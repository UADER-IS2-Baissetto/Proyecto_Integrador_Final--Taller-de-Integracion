
const express = require("express");
const router = express.Router();

const {
    obtenerProductos,
    obtenerProductoPorId
} = require("../controllers/productoController");

router.get("/", obtenerProductos);
router.get("/:id", obtenerProductoPorId);

module.exports = router;
