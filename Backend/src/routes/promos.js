
const express = require("express");
const router = express.Router();

const {
    obtenerPromos
} = require("../controllers/promoController");

router.get("/", obtenerPromos);

module.exports = router;
