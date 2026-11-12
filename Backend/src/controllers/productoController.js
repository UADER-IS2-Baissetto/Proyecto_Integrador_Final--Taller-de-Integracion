
const pool = require("../config/db");

// GET /api/productos
// Obtiene todos los productos y el nombre de su sabor.
const obtenerProductos = async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                p.id,
                p.nombre,
                p.cantidad,
                p.disponibilidad,
                p.precio,
                p.stock,
                p.calificacion,
                p.edicionespecial,
                p.id_sabor,
                s.nombre AS sabor
            FROM producto p
            LEFT JOIN sabor s ON s.id = p.id_sabor
            ORDER BY p.id ASC
        `);

        return res.status(200).json({
            cantidad: resultado.rows.length,
            productos: resultado.rows
        });
    } catch (error) {
        console.error("Error al obtener productos:", error);

        return res.status(500).json({
            mensaje: "Error interno al obtener los productos"
        });
    }
};

// GET /api/productos/:id
// Obtiene un producto específico.
const obtenerProductoPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "El ID del producto debe ser un número entero positivo"
            });
        }

        const resultado = await pool.query(`
            SELECT
                p.id,
                p.nombre,
                p.cantidad,
                p.disponibilidad,
                p.precio,
                p.stock,
                p.calificacion,
                p.edicionespecial,
                p.id_sabor,
                s.nombre AS sabor
            FROM producto p
            LEFT JOIN sabor s ON s.id = p.id_sabor
            WHERE p.id = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró un producto con ese ID"
            });
        }

        return res.status(200).json({
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al obtener el producto:", error);

        return res.status(500).json({
            mensaje: "Error interno al obtener el producto"
        });
    }
};

module.exports = {
    obtenerProductos,
    obtenerProductoPorId
};
