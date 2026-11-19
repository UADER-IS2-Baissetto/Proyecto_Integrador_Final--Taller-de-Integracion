
const pool = require("../config/db");

// GET /api/promos
// Obtiene las promociones vigentes y los datos del producto asociado.
const obtenerPromos = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                pr.id,
                pr.idproducto,
                pr.fechainicio,
                pr.fechafin,
                pr.valordescuento,
                pr.nombre,
                pr.descripcion,
                pr.imagen,
                pr.cantidad_producto,
                p.nombre AS producto,
                p.cantidad AS cantidad_bombones,
                p.precio,
                s.nombre AS sabor
            FROM promo pr
            INNER JOIN producto p ON p.id = pr.idproducto
            LEFT JOIN sabor s ON s.id = p.id_sabor
            WHERE CURRENT_DATE BETWEEN pr.fechainicio AND pr.fechafin
            ORDER BY pr.id ASC
        `);

        return res.status(200).json({
            cantidad: resultado.rows.length,
            promociones: resultado.rows
        });
    } catch (error) {
        console.error("Error al obtener promociones:", error);

        return res.status(500).json({
            mensaje: "Error interno al obtener las promociones"
        });
    }
};

module.exports = {
    obtenerPromos
};
