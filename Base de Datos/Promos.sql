-- Insertando promo
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

-- Añadiendo otra columna con un id mas
-- Permitiendo sumar otro tipo de promos
ALTER TABLE promo
ADD COLUMN idproducto_complementario INTEGER
REFERENCES producto(id);

-- Creando nuevas promos
INSERT INTO promo (
    idproducto,
    idproducto_complementario,
    fechainicio,
    fechafin,
    valordescuento,
    nombre,
    descripcion,
    imagen,
    cantidad_producto
)
VALUES
(
    4,
    7,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    20,
    'Esencia Moderna',
    'Combiná una caja de Esencia Argentina con una de Fusión Moderna, ambas del mismo tamaño, y disfrutá de un 20% de descuento.',
    'Promos/esencia-moderna.png',
    1
),
(
    5,
    8,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    20,
    'Esencia Moderna',
    'Combiná una caja de Esencia Argentina con una de Fusión Moderna, ambas del mismo tamaño, y disfrutá de un 20% de descuento.',
    'Promos/esencia-moderna.png',
    1
),
(
    6,
    9,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    20,
    'Esencia Moderna',
    'Combiná una caja de Esencia Argentina con una de Fusión Moderna, ambas del mismo tamaño, y disfrutá de un 20% de descuento.',
    'Promos/esencia-moderna.png',
    1
);

