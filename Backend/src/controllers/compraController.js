
const pool = require("../config/db");

// Confirmar compra desde el carrito
const confirmarCompra = async (req, res) => {
    try {
        const idCliente = req.usuario.id;

        const resultado = await pool.query(
            `SELECT confirmar_compra($1) AS id_compra`,
            [idCliente]
        );

        const idCompra = resultado.rows[0].id_compra;

        return res.status(201).json({
            mensaje: "Compra confirmada correctamente",
            compra: {
                id: idCompra
            }
        });

    } catch (error) {
        console.error("Error al confirmar compra:", error);

        if (error.code === "P0001") {
            return res.status(400).json({
                mensaje: error.message
            });
        }

        return res.status(500).json({
            mensaje: "Error interno al confirmar la compra"
        });
    }
};

// Obtener historial de compras del usuario autenticado
const obtenerCompras = async (req, res) => {
    try {
        const idCliente = req.usuario.id;

        const resultado = await pool.query(
            `SELECT *
             FROM obtener_compras_cliente($1)
             ORDER BY fecha DESC, id_compra DESC`,
            [idCliente]
        );

        return res.json({
            cantidad: resultado.rows.length,
            compras: resultado.rows
        });

    } catch (error) {
        console.error("Error al obtener compras:", error);

        return res.status(500).json({
            mensaje: "Error al obtener el historial de compras"
        });
    }
};

// Obtener el detalle de una compra específica
const obtenerCompraPorId = async (req, res) => {
    try {
        const idCliente = req.usuario.id;
        const idCompra = Number(req.params.id);

        if (!Number.isInteger(idCompra) || idCompra <= 0) {
            return res.status(400).json({
                mensaje: "El ID de compra no es válido"
            });
        }

        // Buscar compra verificando que pertenezca al usuario
        const compraResultado = await pool.query(
            `SELECT id, idcliente, estado, total, fecha, descuento
             FROM compra
             WHERE id = $1 AND idcliente = $2`,
            [idCompra, idCliente]
        );

        if (compraResultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "Compra no encontrada"
            });
        }

        // Obtener los productos de esa compra
        const productosResultado = await pool.query(
            `SELECT
                cp.id,
                cp.idproducto,
                p.nombre,
                p.cantidad AS bombones_por_caja,
                cp.unidades,
                cp.preciounitario AS precio_unitario,
                cp.descuento,
                cp.subtotal,
                s.nombre AS sabor
             FROM compraproducto cp
             JOIN producto p ON p.id = cp.idproducto
             LEFT JOIN sabor s ON s.id = p.id_sabor
             WHERE cp.idcompra = $1
             ORDER BY cp.id`,
            [idCompra]
        );

        return res.json({
            compra: compraResultado.rows[0],
            productos: productosResultado.rows
        });

    } catch (error) {
        console.error("Error al obtener detalle de compra:", error);

        return res.status(500).json({
            mensaje: "Error al obtener el detalle de la compra"
        });
    }
};

module.exports = {
    confirmarCompra,
    obtenerCompras,
    obtenerCompraPorId
};
