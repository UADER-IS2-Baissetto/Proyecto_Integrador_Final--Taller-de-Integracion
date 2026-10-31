-- Punto 4: Tablas
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

-- Punto 5: Users
create user admin_user with password 'amargoydulce';
create user cliente_user with password 'cliente123';

-- permisos admin (control total)
grant all privileges on all tables in schema public to admin_user;
grant all privileges on all sequences in schema public to admin_user;

-- permisos cliente (Ver datos, manejar carrito, comprar)

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


-- Punto 6: Triggers
-- Control de stock
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

-- Actualizar stock con los ingresos
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

-- Descontar stock automaticamente
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

-- Validar fechas de promos
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

-- Calcular el subtotal automaticamente
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

-- Calcular subtotal carrito
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


-- Validar tamaño de caja de producto
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

-- Punto 7: Inserts
insert into Sabor (nombre) values
('coleccion clasica'),
('esencia Argentina'),
('fusion moderna'),
('banana'),
('leche'),
('mix tropical');

-- Inserts de ejemplos
insert into Cliente (nombre, apellido, correo, contrasena) values
('juan','perez','juan1@mail.com','123'),
('ana','gomez','ana2@mail.com','123'),
('luis','martinez','luis3@mail.com','123'),
('maria','lopez','maria4@mail.com','123'),
('carlos','ruiz','carlos5@mail.com','123'),
('sofia','diaz','sofia6@mail.com','123'),
('diego','fernandez','diego7@mail.com','123'),
('lucia','garcia','lucia8@mail.com','123'),
('pedro','sanchez','pedro9@mail.com','123'),
('valeria','romero','valeria10@mail.com','123'),
('martin','torres','martin11@mail.com','123'),
('julieta','castro','julieta12@mail.com','123'),
('nicolas','suarez','nico13@mail.com','123'),
('camila','mendez','camila14@mail.com','123'),
('andres','silva','andres15@mail.com','123');

-- crear y dar rol de admin a un usuario ficticio
insert into Cliente (nombre, apellido, correo, contrasena, rol) values
('admin','sistema','admin@gmail.com','adminadmin', 'admin');

insert into Localidad values
(1000,'bs as'),
(2000,'rosario'),
(3000,'cordoba'),
(3100,'parana'),
(3200,'concepcion'),
(3300,'posadas'),
(3400,'resistencia'),
(3500,'formosa'),
(3600,'salta'),
(3700,'jujuy'),
(3800,'tucuman'),
(3900,'la rioja'),
(4000,'mendoza'),
(4100,'san juan'),
(4200,'neuquen');

insert into Direccion values
('calle1',100,1,1000),
('calle2',200,2,2000),
('calle3',300,3,3000),
('calle4',400,4,3100),
('calle5',500,5,3200),
('calle6',600,6,3300),
('calle7',700,7,3400),
('calle8',800,8,3500),
('calle9',900,9,3600),
('calle10',1000,10,3700),
('calle11',1100,11,3800),
('calle12',1200,12,3900),
('calle13',1300,13,4000),
('calle14',1400,14,4100),
('calle15',1500,15,4200);

-- Insert stock
insert into Producto (nombre, cantidad, disponibilidad, precio, stock, calificacion, edicionespecial, id_sabor) values
('coleccion clasica 6',6,true,2000,60,4,false,1),
('coleccion clasica 12',12,true,3500,60,5,false,1),
('coleccion clasica 24',24,true,6000,60,4,false,1),

('esencia argentina 6',6,true,2000,60,4,false,2),
('esencia argentina 12',12,true,3500,60,5,false,2),
('esencia argentina 24',24,true,6000,60,5,false,2),

('fusion moderna 6',6,true,2000,60,3,false,3),
('fusion moderna 12',12,true,3500,60,4,false,3),
('fusion moderna 24',24,true,6000,60,5,false,3),

('banana 6',6,true,2000,60,4,false,4),
('banana 12',12,true,3500,60,4,false,4),
('banana 24',24,true,6000,60,4,false,4),

('leche 6',6,true,2000,60,5,false,5),
('leche 12',12,true,3500,60,5,false,5),
('leche 24',24,true,6000,60,5,false,5),

('mix tropical 6',6,true,2000,60,4,false,6),
('mix tropical 12',12,true,3500,60,4,false,6),
('mix tropical 24',24,true,6000,60,4,false,6);

-- Carrito
insert into Carrito (idcliente, valido) values
(1,true),(2,true),(3,true),(4,true),(5,true),
(6,true),(7,true),(8,true),(9,true),(10,true),
(11,true),(12,true),(13,true),(14,true),(15,true);

insert into CarritoProducto (idcarrito, idproducto, unidades, preciounitario, subtotal, descuento) values
(1,1,2,2000,4000,0),
(2,2,1,3500,3500,0),
(3,3,1,6000,5900,10),

(4,4,2,2000,4000,0),
(5,5,1,3500,3400,10),
(6,6,1,6000,6000,0),

(7,7,2,2000,4000,0),
(8,8,1,3500,3500,0),
(9,9,1,6000,5900,10),

(10,10,2,2000,4000,0),
(11,11,1,3500,3500,0),
(12,12,1,6000,6000,0),

(13,13,2,2000,4000,0),
(14,14,1,3500,3500,0),
(15,15,1,6000,6000,0);

insert into Compra (idcliente, estado, total, fecha, descuento) values
(1,'entregado',3600,'2025-01-01',10),
(11,'pendiente',5400,'2025-01-01',5),
(2,'pendiente',3500,'2025-01-02',0),
(3,'entregado',5400,'2025-01-03',10),

(4,'pendiente',3600,'2025-01-04',10),
(5,'entregado',3150,'2025-01-05',10),
(6,'pendiente',6000,'2025-01-06',0),

(7,'entregado',4000,'2025-01-07',0),
(8,'pendiente',3500,'2025-01-08',0),
(9,'entregado',5400,'2025-01-09',10),

(10,'pendiente',3600,'2025-01-10',10),
(11,'entregado',3500,'2025-01-11',0),
(12,'pendiente',6000,'2025-01-12',0),

(13,'entregado',4000,'2025-01-13',0),
(14,'pendiente',3500,'2025-01-14',0),
(15,'entregado',6000,'2025-01-15',0);

insert into CompraProducto (idcompra, idproducto, unidades, preciounitario, subtotal, descuento) values
(1,1,2,2000,3600,10),
(2,2,1,3500,3500,0),
(3,3,1,6000,5400,10),

(4,4,2,2000,3600,10),
(5,5,1,3500,3150,10),
(6,6,1,6000,6000,0),

(7,7,2,2000,4000,0),
(8,8,1,3500,3500,0),
(9,9,1,6000,5400,10),

(10,10,2,2000,3600,10),
(11,11,1,3500,3500,0),
(12,12,1,6000,6000,0),

(13,13,2,2000,4000,0),
(14,14,1,3500,3500,0),
(15,15,1,6000,6000,0);

insert into Ingreso (idproducto, fechaentrada, cantidadingreso) values
(1,'2025-01-01',10),
(2,'2025-01-02',10),
(3,'2025-01-03',10),
(4,'2025-01-04',10),
(5,'2025-01-05',10),
(6,'2025-01-06',10),
(7,'2025-01-07',10),
(8,'2025-01-08',10),
(9,'2025-01-09',10),
(10,'2025-01-10',10),
(11,'2025-01-11',10),
(12,'2025-01-12',10),
(13,'2025-01-13',10),
(14,'2025-01-14',10),
(15,'2025-01-15',10);

-- Punto 8: Vistas
-- Productos y sabor de estos
create view vista_productos as
select 
    p.id,
    p.nombre,
    p.precio,
    p.stock,
    s.nombre as sabor
from Producto p
join Sabor s on p.id_sabor = s.id;

-- Compras y cliente que las hizo
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

-- Productos mas vendidos
create view vista_productos_vendidos as
select
    p.id,
    p.nombre,
    sum(cp.unidades) as total_vendido
from Producto p
join CompraProducto cp on p.id = cp.idproducto
group by p.id, p.nombre
order by total_vendido desc;

-- Carrito detallado
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

-- Vista ingresos por producto
create view vista_ingresos_productos as
select
    p.nombre,
    sum(cp.subtotal) as total_ingresos
from Producto p
join CompraProducto cp on p.id = cp.idproducto
group by p.nombre
order by total_ingresos desc;

-- Punto 9: Funciones o Stored Procedures
-- Historial de compras por cliente
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

-- Lista de ventas por fecha
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

-- Filtrar productos en un rango de precio
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

-- Filtrar productos por cantidad
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

-- Filtrar productos que son edicion especial
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

-- Total vendido en una fecha
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

-- Lista de productos sin stock
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

-- Confirmar compra desde carrito
create or replace function confirmar_compra(p_idcliente int)
returns int as $$
declare
    v_idcarrito int;
    v_idcompra int;
    v_total decimal := 0;
    item record;
begin
    -- Buscar y bloquear el carrito valido del cliente
    select id
    into v_idcarrito
    from carrito
    where idcliente = p_idcliente
      and valido = true
    order by id desc
    limit 1
    for update;

    if v_idcarrito is null then
        raise exception 'El cliente no tiene un carrito valido';
    end if;

    -- Verificar que el carrito tenga productos
    if not exists (
        select 1
        from carritoproducto
        where idcarrito = v_idcarrito
    ) then
        raise exception 'El carrito esta vacio';
    end if;

    -- Bloquear los productos involucrados para evitar
    -- modificaciones simultaneas de stock durante la compra
    perform p.id
    from producto p
    join carritoproducto cp on cp.idproducto = p.id
    where cp.idcarrito = v_idcarrito
    order by p.id
    for update of p;

    -- Validar stock considerando la cantidad total
    -- de cada producto dentro del carrito
    for item in
        select
            cp.idproducto,
            sum(cp.unidades) as unidades,
            p.stock
        from carritoproducto cp
        join producto p on p.id = cp.idproducto
        where cp.idcarrito = v_idcarrito
        group by cp.idproducto, p.stock
    loop
        if item.stock < item.unidades then
            raise exception
                'Stock insuficiente para el producto ID %',
                item.idproducto;
        end if;
    end loop;

    -- Calcular el total con precios actuales y promociones vigentes
    select coalesce(
        sum(
            cp.unidades * p.precio *
            (1 - (
                select coalesce(max(pr.valordescuento), 0)
                from promo pr
                where pr.idproducto = p.id
                  and current_date between pr.fechainicio and pr.fechafin
            ) / 100)
        ),
        0
    )
    into v_total
    from carritoproducto cp
    join producto p on p.id = cp.idproducto
    where cp.idcarrito = v_idcarrito;

    if v_total <= 0 then
        raise exception 'El total de la compra debe ser mayor a cero';
    end if;

    -- Crear la compra
    insert into compra (
        idcliente,
        estado,
        total,
        fecha,
        descuento
    )
    values (
        p_idcliente,
        'pendiente',
        v_total,
        current_date,
        0
    )
    returning id into v_idcompra;

    -- Registrar los productos con sus precios actuales
    -- y descuentos de promociones vigentes
    insert into compraproducto (
        idcompra,
        idproducto,
        unidades,
        preciounitario,
        subtotal,
        descuento
    )
    select
        v_idcompra,
        p.id,
        cp.unidades,
        p.precio,
        0,
        (
            select coalesce(max(pr.valordescuento), 0)
            from promo pr
            where pr.idproducto = p.id
              and current_date between pr.fechainicio and pr.fechafin
        )
    from carritoproducto cp
    join producto p on p.id = cp.idproducto
    where cp.idcarrito = v_idcarrito;

    -- El trigger trg_restar_stock_compra descuenta el stock
    -- automaticamente al insertar los detalles de la compra

    -- Vaciar el carrito
    delete from carritoproducto
    where idcarrito = v_idcarrito;

    return v_idcompra;
end;
$$ language plpgsql;

-- Usos --
select * from obtener_compras_cliente(1);

select * from ventas_por_fecha('2025-01-01');

select * from productos_por_precio(2000, 5000);

select * from productos_por_cantidad(12);

select * from productos_edicion_especial();

select total_ventas_fecha('2025-01-01');

select * from productos_sin_stock();

select confirmar_compra(1);

-- Ejemplos de error
-- comprar producto sin stock
update Producto
set stock = 0
where nombre like 'banana%';

insert into CompraProducto (idcompra, idproducto, unidades, preciounitario, subtotal, descuento)
values (1, 10, 1, 2000, 2000, 0);

-- stock negativo
update Producto
set stock = -1
where id = 1;

 -- precio negativo
insert into Producto (nombre, cantidad, disponibilidad, precio, stock, calificacion, edicionespecial, id_sabor)
values ('producto error', 6, true, -100, 10, 4, false, 1);

-- fechas promos
insert into Promo (idproducto, fechainicio, fechafin, valordescuento)
values (1, '2025-05-10', '2025-05-01', 10);


----------------- TESTEO COMPLETO ----------------

-- Agregar productos al carrito del cliente 1
insert into CarritoProducto
(idcarrito, idproducto, unidades, preciounitario, subtotal, descuento)
values
(1, 4, 2, 2000, 0, 0),
(1, 5, 1, 3500, 0, 10);

-- Mostrar carrito antes de confirmar
select *
from vista_carrito_detalle
where id_carrito = 1;

-- Mostrar stock inicial
select id, nombre, stock
from Producto
where id in (4,5);

-- Confirmar compra
select confirmar_compra(1);

-- Mostrar última compra generada
select *
from Compra
where idcliente = 1
order by id desc
limit 1;

-- Mostrar detalle de la compra
select cp.*
from CompraProducto cp
where cp.idcompra =
(
    select max(id)
    from Compra
    where idcliente = 1
);

-- Mostrar stock actualizado
select id, nombre, stock
from Producto
where id in (4,5);

-- Verificar que el carrito quedó vacío
select *
from CarritoProducto
where idcarrito = 1;