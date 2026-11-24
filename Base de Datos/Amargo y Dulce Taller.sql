------------------------------ Tablas ----------------------------------
create table Cliente (
    id serial primary key,
    nombre varchar(30) not null,
    apellido varchar(30) not null,
    correo varchar(30) not null unique,
    contrasena varchar(255) not null,
    rol varchar(20) not null default 'cliente',
	direccion VARCHAR(255)
);

create table Localidad (
    codigopostal int primary key,
    nombre varchar(30) not null
);

create table Direccion (
    calle varchar(30),
    numerocalle int check (numerocalle > 0),
    idcliente int,
    idlocalidad int,
    primary key (calle, numerocalle),
    foreign key (idcliente) references Cliente(id),
    foreign key (idlocalidad) references Localidad(codigopostal)
);

create table Sabor (
    id serial primary key,
    nombre varchar(30) not null
);

create table Producto (
    id serial primary key,
    nombre varchar(30) not null,
    cantidad int not null,
    disponibilidad boolean not null,
    precio decimal check (precio > 0),
    stock int check (stock >= 0),
    calificacion int check (calificacion >= 0 and calificacion <= 5),
    edicionespecial boolean not null,
    id_sabor int,
	imagen varchar(255),
    foreign key (id_sabor) references Sabor(id)
);

create table Carrito (
    id serial primary key,
    idcliente int,
    valido boolean not null,
    foreign key (idcliente) references Cliente(id)
);

create table CarritoProducto (
    id serial primary key,
    idcarrito int,
    idproducto int,
    unidades int check (unidades > 0),
    preciounitario decimal check (preciounitario > 0),
    subtotal decimal check (subtotal >= 0),
    descuento decimal check (descuento >= 0 and descuento <= 100),
    foreign key (idcarrito) references Carrito(id),
    foreign key (idproducto) references Producto(id)
);

create table Compra (
    id serial primary key,
    idcliente int,
    estado varchar(30) not null,
    total decimal check (total > 0),
    fecha date not null,
    descuento int check (descuento >= 0),
    foreign key (idcliente) references Cliente(id)
);

create table CompraProducto (
    id serial primary key,
    idcompra int,
    idproducto int,
    unidades int check (unidades > 0),
    preciounitario decimal check (preciounitario > 0),
    subtotal decimal check (subtotal >= 0),
    descuento decimal check (descuento >= 0 and descuento <= 100),
    foreign key (idcompra) references Compra(id),
    foreign key (idproducto) references Producto(id)
);

create table Reseña (
    id serial primary key,
    idcliente int,
    idproducto int,
    contenido varchar(200) not null,
    foreign key (idcliente) references Cliente(id),
    foreign key (idproducto) references Producto(id)
);

create table Favorito (
    id serial primary key,
    idcliente int,
    idproducto int,
    foreign key (idcliente) references Cliente(id),
    foreign key (idproducto) references Producto(id)
);

Create table Promo (
    id serial primary key,
    idproducto int,
	nombre varchar(100),
	descripcion varchar(500),
    fechainicio date not null,
    fechafin date not null,
	imagen varchar(255),
	cantidad_producto int,
    valordescuento decimal check (valordescuento > 0),
    foreign key (idproducto) references Producto(id)
);

-- Eliminar duplicados existentes, si los hubiera
DELETE FROM favorito a
USING favorito b
WHERE a.id > b.id
  AND a.idcliente = b.idcliente
  AND a.idproducto = b.idproducto;

-- Impedir que un cliente guarde dos veces el mismo producto
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorito_cliente_producto
ON favorito (idcliente, idproducto);

create table Ingreso (
    id serial primary key,
    idproducto int,
    fechaentrada date not null,
    cantidadingreso int check (cantidadingreso > 0),
    foreign key (idproducto) references Producto(id)
);

-------------------- Permisos -------------------------
alter table promo
add constraint chk_promo_cantidad
check (cantidad_producto is null or cantidad_producto > 0);

alter table promo
add constraint chk_promo_descuento
check (valordescuento > 0 and valordescuento <= 100);

-------------------------------- Users --------------------------------
-- create user admin_user with password 'amargoydulce';
-- create user cliente_user with password 'cliente123';

-------------------- permisos admin (control total) -------------------
grant all privileges on all tables in schema public to admin_user;
grant all privileges on all sequences in schema public to admin_user;

--------- permisos cliente (Ver datos, manejar carrito, comprar) ------

grant select on Cliente to cliente_user;
grant select on Producto to cliente_user;
grant select on Compra to cliente_user;
grant select on CompraProducto to cliente_user;
grant select on Carrito to cliente_user;
grant select on CarritoProducto to cliente_user;

grant insert, update, delete on Carrito to cliente_user;
grant insert, update, delete on CarritoProducto to cliente_user;

grant insert on Compra to cliente_user;
grant insert on CompraProducto to cliente_user;

-- Darle permisos de admin a un usuario --
--UPDATE cliente
--SET rol = 'admin'
--WHERE LOWER(TRIM(correo)) = LOWER('admin@amargoydulce.com')
--RETURNING id, nombre, apellido, correo, rol;


-------------------------------- Triggers --------------------------------
---------------------------- Control de stock ----------------------------
create or replace function controlar_stock()
returns trigger as $$
begin
    if new.stock < 0 then
        raise exception 'El stock no puede ser negativo';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_stock
before insert or update on Producto
for each row
execute function controlar_stock();

------------------- Actualizar stock con los ingresos --------------------
create or replace function actualizar_stock_ingreso()
returns trigger as $$
begin
    update Producto
    set stock = stock + new.cantidadingreso
    where id = new.idproducto;

    return new;
end;
$$ language plpgsql;

create trigger trg_actualizar_stock_ingreso
after insert on Ingreso
for each row
execute function actualizar_stock_ingreso();

---------------------- Descontar stock automaticamente ---------------------
create or replace function restar_stock_compra()
returns trigger as $$
begin
    update Producto
    set stock = stock - new.unidades
    where id = new.idproducto
    and stock >= new.unidades;

    if not found then
        raise exception 'Stock insuficiente para realizar la compra';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger trg_restar_stock_compra
after insert on CompraProducto
for each row
execute function restar_stock_compra();

------------------------- Validar fechas de promos --------------------------
create or replace function validar_fechas_promo()
returns trigger as $$
begin
    if new.fechafin < new.fechainicio then
        raise exception 'La fecha fin no puede ser menor a la fecha inicio';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_promo
before insert or update on Promo
for each row
execute function validar_fechas_promo();

-------------------- Calcular el subtotal automaticamente -----------------
create or replace function calcular_subtotal()
returns trigger as $$
begin
    new.subtotal := (new.preciounitario * new.unidades) * (1 - new.descuento/100);
    return new;
end;
$$ language plpgsql;

create trigger trg_subtotal
before insert or update on CompraProducto
for each row
execute function calcular_subtotal();

------------------------- Calcular subtotal carrito -------------------------
create or replace function calcular_subtotal_carrito()
returns trigger as $$
begin
    new.subtotal := (new.preciounitario * new.unidades) * (1 - new.descuento/100);
    return new;
end;
$$ language plpgsql;

create trigger trg_subtotal_carrito
before insert or update on CarritoProducto
for each row
execute function calcular_subtotal_carrito();


------------------- Validar tamaño de caja de producto ---------------------
create or replace function validar_cantidad_producto()
returns trigger as $$
begin
    if new.cantidad not in (6, 12, 24) then
        raise exception 'La cantidad de producto solo puede ser 6, 12 o 24';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_validar_cantidad
before insert or update on Producto
for each row
execute function validar_cantidad_producto();

-- =========================================================
-- 1. Eliminar el descuento automático al insertar productos

DROP TRIGGER IF EXISTS trg_restar_stock_compra ON compraproducto;
-- La función anterior ya no será utilizada por ese trigger.

-- =========================================================
-- 2. Descontar stock cuando el pago queda aprobado

CREATE OR REPLACE FUNCTION descontar_stock_compra_pagada()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Bloquear y validar todos los productos de la compra.
    FOR item IN
        SELECT
            cp.idproducto,
            SUM(cp.unidades)::integer AS unidades,
            p.stock
        FROM compraproducto cp
        JOIN producto p ON p.id = cp.idproducto
        WHERE cp.idcompra = NEW.id
        GROUP BY cp.idproducto, p.stock
        ORDER BY cp.idproducto
        FOR UPDATE OF p
    LOOP
        IF item.stock < item.unidades THEN
            RAISE EXCEPTION
                'Stock insuficiente para el producto ID %',
                item.idproducto;
        END IF;
    END LOOP;

    -- Descontar las unidades de todos los productos.
    UPDATE producto p
    SET stock = p.stock - detalle.unidades
    FROM (
        SELECT
            idproducto,
            SUM(unidades)::integer AS unidades
        FROM compraproducto
        WHERE idcompra = NEW.id
        GROUP BY idproducto
    ) detalle
    WHERE p.id = detalle.idproducto;

    -- Vaciar el carrito válido del cliente únicamente después
    -- de que el pago haya sido aprobado.
    DELETE FROM carritoproducto
    WHERE idcarrito IN (
        SELECT id
        FROM carrito
        WHERE idcliente = NEW.idcliente
          AND valido = TRUE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- 3. Ejecutar el descuento solo al pasar de pendiente a pagada
-- =========================================================

DROP TRIGGER IF EXISTS trg_descontar_stock_compra_pagada ON compra;

CREATE TRIGGER trg_descontar_stock_compra_pagada
AFTER UPDATE OF estado ON compra
FOR EACH ROW
WHEN (OLD.estado = 'pendiente' AND NEW.estado = 'pagada')
EXECUTE FUNCTION descontar_stock_compra_pagada();

-------------------------------- Inserts --------------------------------
insert into Sabor (nombre) values
('coleccion clasica'),
('esencia Argentina'),
('fusion moderna'),
('banana'),
('leche'),
('mix tropical');

-------------- crear y dar rol de admin a un usuario ficticio ---------
insert into Cliente (nombre, apellido, correo, contrasena, rol) values
('admin','sistema','admin@gmail.com','adminadmin', 'admin');

-------------------------------- Vistas --------------------------------
---------------------- Productos y sabor de estos ----------------------
create view vista_productos as
select 
    p.id,
    p.nombre,
    p.precio,
    p.stock,
    s.nombre as sabor
from Producto p
join Sabor s on p.id_sabor = s.id;

--------------------- Compras y cliente que las hizo -----------------
create view vista_compras_clientes as
select
    c.id as id_compra,
    cl.nombre,
    cl.apellido,
    c.total,
    c.estado,
    c.fecha
from Compra c
join Cliente cl on c.idcliente = cl.id;

------------------------ Productos mas vendidos -------------------
create view vista_productos_vendidos as
select
    p.id,
    p.nombre,
    sum(cp.unidades) as total_vendido
from Producto p
join CompraProducto cp on p.id = cp.idproducto
group by p.id, p.nombre
order by total_vendido desc;

-------------------------- Carrito detallado ----------------------
create view vista_carrito_detalle as
select
    c.id as id_carrito,
    cl.nombre,
    cl.apellido,
    p.nombre as producto,
    cp.unidades,
    cp.preciounitario,
    cp.descuento,
    cp.subtotal
from Carrito c
join Cliente cl on c.idcliente = cl.id
join CarritoProducto cp on c.id = cp.idcarrito
join Producto p on cp.idproducto = p.id;

---------------------- Vista ingresos por producto ------------------
create view vista_ingresos_productos as
select
    p.nombre,
    sum(cp.subtotal) as total_ingresos
from Producto p
join CompraProducto cp on p.id = cp.idproducto
group by p.nombre
order by total_ingresos desc;

--------------------- Funciones o Stored Procedures ---------------
-------------------- Historial de compras por cliente ------------
create or replace function obtener_compras_cliente(p_idcliente int)
returns table (
    id_compra int,
    fecha date,
    estado varchar,
    total decimal
) as $$
begin
    return query
    select
        c.id,
        c.fecha,
        c.estado,
        c.total
    from Compra c
    where c.idcliente = p_idcliente;
end;
$$ language plpgsql;

---------------------- Lista de ventas por fecha ------------------
create or replace function ventas_por_fecha(p_fecha date)
returns table (
    id_compra int,
    cliente varchar,
    total decimal
) as $$
begin
    return query
    select
        c.id,
        (cl.nombre || ' ' || cl.apellido)::varchar,
        c.total
    from Compra c
    join Cliente cl on c.idcliente = cl.id
    where c.fecha = p_fecha;
end;
$$ language plpgsql;

------------------ Filtrar productos en un rango de precio -----------------
create or replace function productos_por_precio(p_min decimal, p_max decimal)
returns table (
    id int,
    nombre varchar,
    precio decimal
) as $$
begin
    return query
    select
        p.id,
        p.nombre,
        p.precio
    from Producto p
    where p.precio between p_min and p_max;
end;
$$ language plpgsql;

---------------------- Filtrar productos por cantidad --------------------
create or replace function productos_por_cantidad(p_cantidad int)
returns table (
    id int,
    nombre varchar,
    precio decimal
) as $$
begin
    return query
    select
        p.id,
        p.nombre,
        p.precio
    from Producto p
    where p.cantidad = p_cantidad;
end;
$$ language plpgsql;

------------ Filtrar productos que son edicion especial -------------
create or replace function productos_edicion_especial()
returns table (
    id int,
    nombre varchar,
    precio decimal
) as $$
begin
    return query
    select
        p.id,
        p.nombre,
        p.precio
    from Producto p
    where p.edicionespecial = true;
end;
$$ language plpgsql;

--------------------- Registro de productos vendidos ------------
CREATE OR REPLACE VIEW vista_productos_vendidos AS
SELECT
    p.id,
    p.nombre,
    SUM(cp.unidades) AS total_vendido
FROM producto p
JOIN compraproducto cp
    ON p.id = cp.idproducto
JOIN compra c
    ON c.id = cp.idcompra
WHERE c.estado = 'pagada'
GROUP BY p.id, p.nombre
ORDER BY SUM(cp.unidades) DESC;

----------------------- Total vendido en una fecha --------------------
create or replace function total_ventas_fecha(p_fecha date)
returns decimal as $$
declare
    total_ventas decimal;
begin
    select sum(total)
    into total_ventas
    from Compra
    where fecha = p_fecha;

    return coalesce(total_ventas, 0);
end;
$$ language plpgsql;

-------------------- Lista de productos sin stock -------------------
create or replace function productos_sin_stock()
returns table (
    id int,
    nombre varchar,
    stock int
) as $$
begin
    return query
    select
        p.id,
        p.nombre,
        p.stock
    from Producto p
    where p.stock <= 0;
end;
$$ language plpgsql;


-------------------- Confirmar compra desde carrito -----------------

CREATE OR REPLACE FUNCTION confirmar_compra(p_idcliente int)
RETURNS int AS $$
DECLARE
    v_idcarrito int;
    v_idcompra int;
    v_total decimal := 0;
    item RECORD;
BEGIN
    -- Buscar y bloquear el carrito válido del cliente.
    SELECT id
    INTO v_idcarrito
    FROM carrito
    WHERE idcliente = p_idcliente
      AND valido = TRUE
    ORDER BY id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_idcarrito IS NULL THEN
        RAISE EXCEPTION 'El cliente no tiene un carrito válido';
    END IF;

    -- Verificar que el carrito tenga productos.
    IF NOT EXISTS (
        SELECT 1
        FROM carritoproducto
        WHERE idcarrito = v_idcarrito
    ) THEN
        RAISE EXCEPTION 'El carrito está vacío';
    END IF;

    -- Bloquear los productos involucrados.
    PERFORM p.id
    FROM producto p
    JOIN carritoproducto cp ON cp.idproducto = p.id
    WHERE cp.idcarrito = v_idcarrito
    ORDER BY p.id
    FOR UPDATE OF p;

    -- Validar stock.
    FOR item IN
        SELECT
            cp.idproducto,
            SUM(cp.unidades) AS unidades,
            p.stock
        FROM carritoproducto cp
        JOIN producto p ON p.id = cp.idproducto
        WHERE cp.idcarrito = v_idcarrito
        GROUP BY cp.idproducto, p.stock
    LOOP
        IF item.stock < item.unidades THEN
            RAISE EXCEPTION
                'Stock insuficiente para el producto ID %',
                item.idproducto;
        END IF;
    END LOOP;

    /*
        Calcular el total.

        Promociones individuales:
        se aplican por grupos completos de cantidad_producto.

        Promociones combinadas:
        se aplican únicamente a las unidades que forman
        parejas de productos complementarios del mismo tamaño.
    */

    WITH detalle AS (
        SELECT
            cp.idproducto,
            cp.unidades,
            p.precio,

            COALESCE(base.descuento, 0) AS descuento_base,

            COALESCE(combo.unidades_combinadas, 0)
                AS unidades_combinadas,

            COALESCE(combo.descuento, 0)
                AS descuento_combinado

        FROM carritoproducto cp
        JOIN producto p ON p.id = cp.idproducto

        -- Promoción individual.
        LEFT JOIN LATERAL (
            SELECT
                MAX(
                    pr.valordescuento *
                    (
                        FLOOR(
                            cp.unidades::numeric /
                            GREATEST(COALESCE(pr.cantidad_producto, 1), 1)
                        ) *
                        GREATEST(COALESCE(pr.cantidad_producto, 1), 1)
                    ) /
                    NULLIF(cp.unidades, 0)
                ) AS descuento
            FROM promo pr
            WHERE pr.idproducto = cp.idproducto
              AND pr.idproducto_complementario IS NULL
              AND CURRENT_DATE BETWEEN pr.fechainicio AND pr.fechafin
        ) base ON TRUE

        -- Promoción de dos productos distintos.
        LEFT JOIN LATERAL (
            SELECT
                MAX(pr.valordescuento) AS descuento,
                MAX(LEAST(cp.unidades, otro.unidades))
                    AS unidades_combinadas
            FROM promo pr
            JOIN carritoproducto otro
              ON otro.idcarrito = v_idcarrito
             AND otro.idproducto = CASE
                    WHEN pr.idproducto = cp.idproducto
                    THEN pr.idproducto_complementario
                    ELSE pr.idproducto
                 END
            JOIN producto otro_producto
              ON otro_producto.id = otro.idproducto
            WHERE pr.idproducto_complementario IS NOT NULL
              AND (
                  pr.idproducto = cp.idproducto
                  OR pr.idproducto_complementario = cp.idproducto
              )
              AND otro_producto.cantidad = p.cantidad
              AND CURRENT_DATE BETWEEN pr.fechainicio AND pr.fechafin
        ) combo ON TRUE

        WHERE cp.idcarrito = v_idcarrito
    ),
    descuentos AS (
        SELECT
            idproducto,
            unidades,
            precio,

            CASE
                WHEN unidades > 0 THEN
                    (
                        (unidades - unidades_combinadas) * descuento_base
                        +
                        unidades_combinadas *
                        GREATEST(descuento_base, descuento_combinado)
                    ) / unidades
                ELSE 0
            END AS descuento_final

        FROM detalle
    )
    SELECT COALESCE(
        SUM(
            unidades * precio *
            (1 - descuento_final / 100)
        ),
        0
    )
    INTO v_total
    FROM descuentos;

    IF v_total <= 0 THEN
        RAISE EXCEPTION 'El total de la compra debe ser mayor a cero';
    END IF;

    -- Crear la compra pendiente.
    INSERT INTO compra (
        idcliente,
        estado,
        total,
        fecha,
        descuento
    )
    VALUES (
        p_idcliente,
        'pendiente',
        v_total,
        CURRENT_DATE,
        0
    )
    RETURNING id INTO v_idcompra;

    -- Registrar los productos con sus descuentos correspondientes.
    WITH detalle AS (
        SELECT
            cp.idproducto,
            cp.unidades,
            p.precio,

            COALESCE(base.descuento, 0) AS descuento_base,

            COALESCE(combo.unidades_combinadas, 0)
                AS unidades_combinadas,

            COALESCE(combo.descuento, 0)
                AS descuento_combinado

        FROM carritoproducto cp
        JOIN producto p ON p.id = cp.idproducto

        -- Promoción individual.
        LEFT JOIN LATERAL (
            SELECT
                MAX(
                    pr.valordescuento *
                    (
                        FLOOR(
                            cp.unidades::numeric /
                            GREATEST(COALESCE(pr.cantidad_producto, 1), 1)
                        ) *
                        GREATEST(COALESCE(pr.cantidad_producto, 1), 1)
                    ) /
                    NULLIF(cp.unidades, 0)
                ) AS descuento
            FROM promo pr
            WHERE pr.idproducto = cp.idproducto
              AND pr.idproducto_complementario IS NULL
              AND CURRENT_DATE BETWEEN pr.fechainicio AND pr.fechafin
        ) base ON TRUE

        -- Promoción de dos productos distintos.
        LEFT JOIN LATERAL (
            SELECT
                MAX(pr.valordescuento) AS descuento,
                MAX(LEAST(cp.unidades, otro.unidades))
                    AS unidades_combinadas
            FROM promo pr
            JOIN carritoproducto otro
              ON otro.idcarrito = v_idcarrito
             AND otro.idproducto = CASE
                    WHEN pr.idproducto = cp.idproducto
                    THEN pr.idproducto_complementario
                    ELSE pr.idproducto
                 END
            JOIN producto otro_producto
              ON otro_producto.id = otro.idproducto
            WHERE pr.idproducto_complementario IS NOT NULL
              AND (
                  pr.idproducto = cp.idproducto
                  OR pr.idproducto_complementario = cp.idproducto
              )
              AND otro_producto.cantidad = p.cantidad
              AND CURRENT_DATE BETWEEN pr.fechainicio AND pr.fechafin
        ) combo ON TRUE

        WHERE cp.idcarrito = v_idcarrito
    ),
    descuentos AS (
        SELECT
            idproducto,
            unidades,
            precio,

            CASE
                WHEN unidades > 0 THEN
                    (
                        (unidades - unidades_combinadas) * descuento_base
                        +
                        unidades_combinadas *
                        GREATEST(descuento_base, descuento_combinado)
                    ) / unidades
                ELSE 0
            END AS descuento_final

        FROM detalle
    )
    INSERT INTO compraproducto (
        idcompra,
        idproducto,
        unidades,
        preciounitario,
        subtotal,
        descuento
    )
    SELECT
        v_idcompra,
        idproducto,
        unidades,
        precio,
        0,
        descuento_final
    FROM descuentos;

    -- El carrito y el stock se mantienen sin cambios
    -- hasta que Mercado Pago confirme el pago.

    RETURN v_idcompra;
END;
$$ LANGUAGE plpgsql;


---------------- Cargando Imagenes en Productos ----------------
update producto
set imagen = 'Productos/coleccion-clasica.png'
where id_sabor = 1;

update producto
set imagen = 'Productos/esencia-argentina.png'
where id_sabor = 2;

update producto
set imagen = 'Productos/fusion-moderna.png'
where id_sabor = 3;

update producto
set imagen = 'Productos/banana.png'
where id_sabor = 4;

update producto
set imagen = 'Productos/leche.png'
where id_sabor = 5;

update producto
set imagen = 'Productos/mix-tropical.png'
where id_sabor = 6;
