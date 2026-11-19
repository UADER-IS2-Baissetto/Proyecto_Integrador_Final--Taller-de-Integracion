insert into promo (
    idproducto,
    fechainicio,
    fechafin,
    valordescuento,
    nombre,
    descripcion,
    imagen,
    cantidad_producto
)
values
(
    16,
    current_date,
    current_date + interval '90 days',
    15,
    'Primavera-Verano',
    'Llevando 2 cajas de bombones sabor Mix tropical del mismo tamaño, obtenés un 15% de descuento.',
    'Promos/primavera-verano.png',
    2
),
(
    17,
    current_date,
    current_date + interval '90 days',
    15,
    'Primavera-Verano',
    'Llevando 2 cajas de bombones sabor Mix tropical del mismo tamaño, obtenés un 15% de descuento.',
    'Promos/primavera-verano.png',
    2
),
(
    18,
    current_date,
    current_date + interval '90 days',
    15,
    'Primavera-Verano',
    'Llevando 2 cajas de bombones sabor Mix tropical del mismo tamaño, obtenés un 15% de descuento.',
    'Promos/primavera-verano.png',
    2
);
