const crypto = require("crypto");
const pool = require("../config/db");

// Validar la firma enviada por Mercado Pago
const validarFirma = (req) => {
    const firma = req.headers["x-signature"];
    const requestId = req.headers["x-request-id"];
    const dataId = req.query["data.id"] || req.body?.data?.id;
    const secreto = process.env.MP_WEBHOOK_SECRET;

    if (!firma || !requestId || !dataId || !secreto) {
        return false;
    }

    const partes = {};

    firma.split(",").forEach((parte) => {
        const [clave, valor] = parte.trim().split("=");
        if (clave && valor) {
            partes[clave] = valor;
        }
    });

    if (!partes.ts || !partes.v1) {
        return false;
    }

    // Mercado Pago utiliza el ID en minúsculas al construir el manifest
    const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${partes.ts};`;

    const hashCalculado = crypto
        .createHmac("sha256", secreto)
        .update(manifest)
        .digest("hex");

    const hashRecibido = partes.v1;

    if (
        hashCalculado.length !== hashRecibido.length ||
        !/^[a-f0-9]+$/i.test(hashRecibido)
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(hashCalculado, "hex"),
        Buffer.from(hashRecibido, "hex")
    );
};

// Consultar la orden directamente en Mercado Pago
const consultarOrdenMP = async (idOrden) => {
    const respuesta = await fetch(
        `https://api.mercadopago.com/v1/orders/${encodeURIComponent(idOrden)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
            },
            signal: AbortSignal.timeout(15000)
        }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        console.error("Error consultando orden en Mercado Pago:", datos);
        throw new Error("No se pudo consultar la orden en Mercado Pago");
    }

    return datos;
};

// Procesar una notificación de Mercado Pago
const recibirNotificacion = async (req, res) => {
    if (!process.env.MP_WEBHOOK_SECRET || !process.env.MP_ACCESS_TOKEN) {
        console.error("Faltan credenciales de Mercado Pago en el .env");
        return res.status(500).json({
            mensaje: "La integración de Mercado Pago no está configurada"
        });
    }

    if (!validarFirma(req)) {
        console.error("Notificación rechazada: firma inválida");
        return res.status(401).json({
            mensaje: "Firma de notificación inválida"
        });
    }

    const tipo = req.query.type || req.body?.type;
    const idOrden = req.query["data.id"] || req.body?.data?.id;

    // Este endpoint está destinado exclusivamente a órdenes
    if (tipo && tipo !== "order") {
        return res.status(200).json({
            mensaje: "Notificación ignorada: tipo de evento no procesado"
        });
    }

    if (!idOrden) {
        return res.status(400).json({
            mensaje: "No se recibió el ID de la orden"
        });
    }

    let conexion;

    try {
        // No confiamos en el estado del body: consultamos la API oficial
        const orden = await consultarOrdenMP(idOrden);

        if (String(orden.id) !== String(idOrden)) {
            return res.status(400).json({
                mensaje: "El ID de la orden no coincide"
            });
        }

        const idCompra = Number(orden.external_reference);

        if (!Number.isInteger(idCompra) || idCompra <= 0) {
            console.error("La orden no tiene una referencia de compra válida");
            return res.status(200).json({
                mensaje: "Orden ignorada: referencia externa no válida"
            });
        }

        conexion = await pool.connect();
        await conexion.query("BEGIN");

        const resultadoCompra = await conexion.query(
            `SELECT id, estado, total, mp_order_id
             FROM compra
             WHERE id = $1
             FOR UPDATE`,
            [idCompra]
        );

        if (resultadoCompra.rows.length === 0) {
            await conexion.query("ROLLBACK");
            return res.status(200).json({
                mensaje: "No existe una compra asociada a esta orden"
            });
        }

        const compra = resultadoCompra.rows[0];

        // Comprobar que la orden consultada sea la guardada para esa compra
        if (String(compra.mp_order_id) !== String(orden.id)) {
            await conexion.query("ROLLBACK");
            return res.status(200).json({
                mensaje: "La orden no corresponde a la compra indicada"
            });
        }

        // Verificar que el importe de Mercado Pago coincida con PostgreSQL
        const totalCompraCentavos = Math.round(Number(compra.total) * 100);
        const totalOrdenCentavos = Math.round(Number(orden.total_amount) * 100);

        if (
            !Number.isFinite(totalCompraCentavos) ||
            !Number.isFinite(totalOrdenCentavos) ||
            totalCompraCentavos !== totalOrdenCentavos
        ) {
            await conexion.query("ROLLBACK");
            console.error("El importe de la orden no coincide con la compra", {
                idCompra,
                totalCompra: compra.total,
                totalOrden: orden.total_amount
            });

            return res.status(400).json({
                mensaje: "El importe de la orden no coincide con la compra"
            });
        }

        const estadoMP = orden.status;
        const detalleMP = orden.status_detail || null;

        // Guardar siempre el último estado informado por Mercado Pago
        await conexion.query(
            `UPDATE compra
             SET mp_status = $1,
                 mp_status_detail = $2
             WHERE id = $3`,
            [estadoMP, detalleMP, idCompra]
        );

        // Pago acreditado
        if (estadoMP === "processed") {
            if (compra.estado === "pendiente") {
                await conexion.query(
                    `UPDATE compra
                     SET estado = 'pagada'
                     WHERE id = $1`,
                    [idCompra]
                );
            }

            await conexion.query("COMMIT");

            console.log(`Compra ${idCompra}: pago procesado (${detalleMP})`);

            return res.status(200).json({
                mensaje: "Estado de pago actualizado",
                compra: idCompra,
                estado: "pagada",
                mp_status: estadoMP,
                mp_status_detail: detalleMP
            });
        }

        // Orden cancelada o fallida: devolver stock una sola vez
        if (estadoMP === "canceled" || estadoMP === "failed") {
            if (compra.estado === "pendiente") {
                await conexion.query(
                    `UPDATE producto p
                     SET stock = p.stock + detalle.unidades
                     FROM (
                         SELECT idproducto, SUM(unidades)::integer AS unidades
                         FROM compraproducto
                         WHERE idcompra = $1
                         GROUP BY idproducto
                     ) detalle
                     WHERE p.id = detalle.idproducto`,
                    [idCompra]
                );

                await conexion.query(
                    `UPDATE compra
                     SET estado = 'cancelada'
                     WHERE id = $1`,
                    [idCompra]
                );
            }

            await conexion.query("COMMIT");

            console.log(`Compra ${idCompra}: orden ${estadoMP}`);

            return res.status(200).json({
                mensaje: "Estado de pago actualizado",
                compra: idCompra,
                estado: compra.estado === "pendiente" ? "cancelada" : compra.estado,
                mp_status: estadoMP,
                mp_status_detail: detalleMP
            });
        }

        // Reembolso o contracargo: registrar el estado, sin reponer stock
        // automáticamente porque el producto podría haber sido entregado.
        if (estadoMP === "refunded" || estadoMP === "charged_back") {
            const nuevoEstado =
                estadoMP === "refunded" ? "reintegrada" : "contracargo";

            await conexion.query(
                `UPDATE compra
                 SET estado = $1
                 WHERE id = $2`,
                [nuevoEstado, idCompra]
            );

            await conexion.query("COMMIT");

            return res.status(200).json({
                mensaje: "Se registró la actualización de la orden",
                compra: idCompra,
                estado: nuevoEstado,
                mp_status: estadoMP,
                mp_status_detail: detalleMP
            });
        }

        // created, processing y action_required no son estados finales
        await conexion.query("COMMIT");

        return res.status(200).json({
            mensaje: "Notificación recibida. La orden continúa en proceso",
            compra: idCompra,
            estado: compra.estado,
            mp_status: estadoMP,
            mp_status_detail: detalleMP
        });

    } catch (error) {
        if (conexion) {
            try {
                await conexion.query("ROLLBACK");
            } catch (errorRollback) {
                console.error("Error al revertir transacción:", errorRollback);
            }
        }

        console.error("Error procesando webhook:", error);

        // Mercado Pago podrá volver a enviar la notificación
        return res.status(500).json({
            mensaje: "Error al procesar la notificación"
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
};

module.exports = { recibirNotificacion };