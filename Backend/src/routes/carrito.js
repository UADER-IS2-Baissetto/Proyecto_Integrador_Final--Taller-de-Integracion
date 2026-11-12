
const express = require("express");
const router = express.Router();

const {
    obtenerCarrito,
    agregarProducto,
    actualizarProducto,
    eliminarProducto
} = require("../controllers/carritoController");

const {
    confirmarCompra
} = require("../controllers/compraController");

// Consultar carrito
router.get("/", obtenerCarrito);

// Agregar producto
router.post("/items", agregarProducto);

// Modificar cantidad
router.put("/items/:id", actualizarProducto);

// Eliminar producto
router.delete("/items/:id", eliminarProducto);

// Confirmar compra
router.post("/confirmar", confirmarCompra);

module.exports = router;
