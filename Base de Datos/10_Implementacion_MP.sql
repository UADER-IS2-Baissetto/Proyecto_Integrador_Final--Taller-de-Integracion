-- Creando columnas de mp
alter table compra
add column if not exists mp_order_id varchar(100) unique,
add column if not exists mp_status varchar(50),
add column if not exists mp_status_detail varchar(100);

-- Verificando las mismas
select column_name, data_type
from information_schema.columns
where table_name = 'compra'
order by ordinal_position;

-- Creando columna para el enlace de pagos
alter table compra
add column if not exists mp_checkout_url text;

-- Testeo de post de creacion de compra realizada correctamente
select
    id,
    estado,
    total,
    mp_order_id,
    mp_status,
    mp_status_detail,
    mp_checkout_url
from compra
where id = 1;