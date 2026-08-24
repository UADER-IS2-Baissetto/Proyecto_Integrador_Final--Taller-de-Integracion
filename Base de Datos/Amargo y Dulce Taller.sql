------------------------------ Tablas ----------------------------------
create table Cliente (
    id serial primary key,
    nombre varchar(30) not null,
    apellido varchar(30) not null,
    correo varchar(30) not null unique,
    contrasena varchar(255) not null,
    rol varchar(20) not null default 'cliente'
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

create table Promo (
    id serial primary key,
    idproducto int,
    fechainicio date not null,
    fechafin date not null,
    valordescuento decimal check (valordescuento > 0),
    foreign key (idproducto) references Producto(id)
);

create table Ingreso (
    id serial primary key,
    idproducto int,
    fechaentrada date not null,
    cantidadingreso int check (cantidadingreso > 0),
    foreign key (idproducto) references Producto(id)
);

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

------------------- Confirmar compra desde carrito -----------------
create or replace function confirmar_compra(p_idcliente int)
returns void as $$
declare
    v_idcarrito int;
    v_idcompra int;
    v_total decimal := 0;
    item record;
begin

    -- Buscar carrito del cliente
    select id
    into v_idcarrito
    from Carrito
    where idcliente = p_idcliente;

    if v_idcarrito is null then
        raise exception 'El cliente no tiene carrito';
    end if;

    -- Verificar que el carrito tenga productos
    if not exists (
        select 1
        from CarritoProducto
        where idcarrito = v_idcarrito
    ) then
        raise exception 'El carrito está vacío';
    end if;

    -- Validar stock disponible
    for item in
        select cp.idproducto, cp.unidades, p.stock
        from CarritoProducto cp
        join Producto p on cp.idproducto = p.id
        where cp.idcarrito = v_idcarrito
    loop

        if item.stock < item.unidades then
            raise exception 'Stock insuficiente para el producto ID %', item.idproducto;
        end if;

    end loop;

    -- Calcular total
    select sum(subtotal)
    into v_total
    from CarritoProducto
    where idcarrito = v_idcarrito;

    -- Crear compra
    insert into Compra(idcliente, estado, total, fecha, descuento)
    values (p_idcliente, 'pendiente', v_total, current_date, 0)
    returning id into v_idcompra;

    -- Pasar productos del carrito a CompraProducto
    insert into CompraProducto(
        idcompra,
        idproducto,
        unidades,
        preciounitario,
        subtotal,
        descuento
    )
    select
        v_idcompra,
        idproducto,
        unidades,
        preciounitario,
        subtotal,
        descuento
    from CarritoProducto
    where idcarrito = v_idcarrito;

    -- Vaciar carrito
    delete from CarritoProducto
    where idcarrito = v_idcarrito;

end;
$$ language plpgsql;