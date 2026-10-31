
const express = require("express");
const router = express.Router();

const {
    obtenerCompras,
    obtenerCompraPorId
} = require("../controllers/compraController");

const {
    iniciarPago
} = require("../controllers/pagoController");

// Consultar historial de compras
router.get("/", obtenerCompras);

// Consultar detalle de una compra
router.get("/:id", obtenerCompraPorId);

// Crear orden de pago para una compra
router.post("/:id/pagar", iniciarPago);

module.exports = router;
