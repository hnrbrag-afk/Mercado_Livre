create table if not exists titles (
  id               serial primary key,
  user_id          text not null,
  revenda          text not null,
  cliente          text not null,
  cod_cliente      text not null default '',
  titulo           text not null default '',
  situacao         text not null default '',
  valor            double precision not null default 0,
  saldo            double precision not null default 0,
  emissao          text not null default '',
  vencimento       text not null default '',
  pagamento        text not null default '',
  tarifa_venda     double precision not null default 0,
  tarifa_envio     double precision not null default 0,
  despesa_total    double precision not null default 0,
  frete_comprador  double precision not null default 0,
  descontos_bonus  double precision not null default 0,
  valor_liquido    double precision not null default 0,
  venda_cancelada  text not null default '',
  solucao          text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists titles_user_id_idx on titles (user_id);

create table if not exists imports (
  id             serial primary key,
  user_id        text not null,
  filename       text not null,
  revenda_count  integer not null default 0,
  title_count    integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists user_state (
  user_id text primary key,
  seeded  boolean not null default false
);

create index if not exists imports_user_id_idx on imports (user_id);

