
const express = require("express");
const router = express.Router();

const {
    obtenerFavoritos,
    agregarFavorito,
    eliminarFavorito
} = require("../controllers/favoritoController");

router.get("/", obtenerFavoritos);
router.post("/:idproducto", agregarFavorito);
router.delete("/:idproducto", eliminarFavorito);

module.exports = router;
