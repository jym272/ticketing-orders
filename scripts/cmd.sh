#!/usr/bin/env bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#tickets=#
#all tables
\dt
#select all from ticket table
select * from ticket;
# attr of ticket table
\d ticket
#                                      Table "public.ticket"
#  Column   |           Type           | Collation | Nullable |              Default
#-----------+--------------------------+-----------+----------+------------------------------------
# id        | integer                  |           | not null | nextval('ticket_id_seq'::regclass)
# title     | character varying(255)   |           | not null |
# price     | numeric                  |           | not null |
# user_id   | character varying(255)   |           | not null |
# createdAt | timestamp with time zone |           |          |
# updatedAt | timestamp with time zone |           |          |
#Indexes:
#    "ticket_pkey" PRIMARY KEY, btree (id)
# insert new entry into ticket table
insert into ticket (title, price, user_id) values ('concert', 20, '123');

#select all from ticket table, get only the id and return as json, print only the json without the key
# Within psql use \t to turn off printing header and row count.
select json_build_object('id', id) from ticket;
select json_agg(json_build_object('id', id)) from ticket;




