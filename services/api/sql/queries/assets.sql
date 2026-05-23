-- name: SearchAssets :many
select id, ticker, name, exchange, asset_type, sector, industry, cik
from assets
where ticker ilike '%' || sqlc.arg(query)::text || '%'
   or name ilike '%' || sqlc.arg(query)::text || '%'
order by ticker
limit sqlc.arg(limit_count)::int;

-- name: GetAssetByTicker :one
select id, ticker, name, exchange, asset_type, sector, industry, cik
from assets
where ticker = upper(sqlc.arg(ticker)::text)
limit 1;
