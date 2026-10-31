const express = require("express");
const router = express.Router();

const {
    recibirNotificacion
} = require("../controllers/webhookController");

// Recibir notificaciones de Mercado Pago
router.post("/mercadopago", recibirNotificacion);

module.exports = router;