
const express = require("express");
const router = express.Router();

const verificarAdmin = require("../middleware/verificarAdmin");

const {
    obtenerProductosAdmin,
    crearProducto,
    actualizarProductoAdmin,
    cambiarDisponibilidad,
    darDeBajaProducto,
    registrarIngreso,
    obtenerComprasAdmin,
    obtenerCompraAdminPorId,
    obtenerVentasPorFechaAdmin,
    obtenerEstadisticas,
    obtenerPromosAdmin,
    crearPromo,
    actualizarPromo,
    eliminarPromo
} = require("../controllers/adminController");

// Todas las rutas de este archivo requieren rol administrador
router.use(verificarAdmin);

// Productos
router.get("/productos", obtenerProductosAdmin);
router.post("/productos", crearProducto);
router.put("/productos/:id", actualizarProductoAdmin);
router.patch("/productos/:id/disponibilidad", cambiarDisponibilidad);
router.patch("/productos/:id/baja", darDeBajaProducto);

// Stock
router.post("/ingresos", registrarIngreso);

// Compras y estadísticas
router.get("/compras", obtenerComprasAdmin);
router.get("/compras/:id", obtenerCompraAdminPorId);
router.get("/ventas/fecha", obtenerVentasPorFechaAdmin);
router.get("/estadisticas", obtenerEstadisticas);

// Promociones
router.get("/promos", obtenerPromosAdmin);
router.post("/promos", crearPromo);
router.put("/promos/:id", actualizarPromo);
router.delete("/promos/:id", eliminarPromo);

module.exports = router;
