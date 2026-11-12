
const pool = require("../config/db");
const crypto = require("crypto");

// Generar una clave UUID estable para cada compra.
// Si se reintenta la solicitud, se reutiliza la misma clave.
const generarClaveIdempotencia = (idCompra) => {
    const hash = crypto
        .createHash("sha256")
        .update(`amargo-y-dulce-compra-${idCompra}`)
        .digest();

    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;

    const hexadecimal = hash.toString("hex");

    return [
        hexadecimal.slice(0, 8),
        hexadecimal.slice(8, 12),
        hexadecimal.slice(12, 16),
        hexadecimal.slice(16, 20),
        hexadecimal.slice(20, 32)
    ].join("-");
};

// Crear orden de pago en Mercado Pago
const iniciarPago = async (req, res) => {
    const conexion = await pool.connect();

    try {
        const idCliente = req.usuario.id;
        const idCompra = Number(req.params.id);

        if (!Number.isInteger(idCompra) || idCompra <= 0) {
            return res.status(400).json({
                mensaje: "El ID de compra no es válido"
            });
        }

        if (!process.env.MP_ACCESS_TOKEN) {
            return res.status(500).json({
                mensaje: "No está configurado el Access Token de Mercado Pago"
            });
        }

        await conexion.query("BEGIN");

        // Buscar y bloquear la compra, verificando que pertenezca al usuario
        const compraResultado = await conexion.query(
            `SELECT
                c.id,
                c.idcliente,
                c.estado,
                c.total,
                c.mp_order_id,
                c.mp_status,
                c.mp_status_detail,
                c.mp_checkout_url,
                cl.correo
             FROM compra c
             JOIN cliente cl ON cl.id = c.idcliente
             WHERE c.id = $1
               AND c.idcliente = $2
             FOR UPDATE OF c`,
            [idCompra, idCliente]
        );

        if (compraResultado.rows.length === 0) {
            await conexion.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "Compra no encontrada"
            });
        }

        const compra = compraResultado.rows[0];

        if (compra.estado !== "pendiente") {
            await conexion.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Esta compra no se encuentra pendiente"
            });
        }

        // Si ya existe una orden, reutilizar su enlace
        if (compra.mp_order_id && compra.mp_checkout_url) {
            await conexion.query("COMMIT");

            return res.json({
                mensaje: "Esta compra ya tiene una orden de pago",
                compra: {
                    id: compra.id,
                    mp_order_id: compra.mp_order_id,
                    mp_status: compra.mp_status,
                    checkout_url: compra.mp_checkout_url
                }
            });
        }

        // Obtener los productos registrados en la compra
        const productosResultado = await conexion.query(
            `SELECT
                p.nombre,
                cp.unidades,
                cp.subtotal,
                round(cp.subtotal / cp.unidades, 2)::text AS precio_unitario
             FROM compraproducto cp
             JOIN producto p ON p.id = cp.idproducto
             WHERE cp.idcompra = $1
             ORDER BY cp.id`,
            [idCompra]
        );

        if (productosResultado.rows.length === 0) {
            await conexion.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "La compra no tiene productos registrados"
            });
        }

        // Preparar los productos para Mercado Pago
        const items = productosResultado.rows.map((producto) => ({
            title: producto.nombre,
            quantity: Number(producto.unidades),
            unit_price: Number(producto.precio_unitario).toFixed(2)
        }));

        // Calcular el total a partir de los importes enviados
        // para que coincida con la suma de los productos
        const totalCentavos = items.reduce((total, item) => {
            return total + Math.round(
                Number(item.unit_price) * 100
            ) * item.quantity;
        }, 0);

        const compraCentavos = Math.round(
            Number(compra.total) * 100
        );

        if (totalCentavos !== compraCentavos) {
            await conexion.query("ROLLBACK");

            return res.status(400).json({
                mensaje: "Los importes de los productos no coinciden con el total de la compra"
            });
        }

        const totalAmount = (totalCentavos / 100).toFixed(2);

        // Crear la orden en Mercado Pago
        const claveIdempotencia = generarClaveIdempotencia(idCompra);

        const respuestaMP = await fetch(
            "https://api.mercadopago.com/v1/orders",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    "X-Idempotency-Key": claveIdempotencia
                },
                body: JSON.stringify({
                    type: "online",
                    total_amount: totalAmount,
                    external_reference: String(idCompra),
                    processing_mode: "manual",
                    capture_mode: "automatic_async",
                    payer: {
                        email: compra.correo
                    },
                    items
                })
            }
        );

        const datosMP = await respuestaMP.json();

        if (!respuestaMP.ok) {
            console.error("Error de Mercado Pago:", datosMP);

            await conexion.query("ROLLBACK");

            return res.status(502).json({
                mensaje: "Mercado Pago no pudo crear la orden",
                detalle: datosMP.message || datosMP.error || "Error en la solicitud"
            });
        }

        if (!datosMP.id || !datosMP.checkout_url) {
            await conexion.query("ROLLBACK");

            return res.status(502).json({
                mensaje: "Mercado Pago no devolvió el ID o el enlace de pago esperado"
            });
        }

        // Guardar la información de la orden en PostgreSQL
        await conexion.query(
            `UPDATE compra
             SET mp_order_id = $1,
                 mp_status = $2,
                 mp_status_detail = $3,
                 mp_checkout_url = $4
             WHERE id = $5`,
            [
                datosMP.id,
                datosMP.status || "created",
                datosMP.status_detail || null,
                datosMP.checkout_url,
                idCompra
            ]
        );

        await conexion.query("COMMIT");

        return res.status(201).json({
            mensaje: "Orden de pago creada correctamente",
            compra: {
                id: idCompra,
                mp_order_id: datosMP.id,
                mp_status: datosMP.status,
                mp_status_detail: datosMP.status_detail
            },
            checkout_url: datosMP.checkout_url
        });

    } catch (error) {
        try {
            await conexion.query("ROLLBACK");
        } catch (errorRollback) {
            console.error("Error al revertir transacción:", errorRollback);
        }

        console.error("Error al iniciar pago:", error);

        return res.status(500).json({
            mensaje: "Error interno al iniciar el pago"
        });

    } finally {
        conexion.release();
    }
};

module.exports = {
    iniciarPago
};
