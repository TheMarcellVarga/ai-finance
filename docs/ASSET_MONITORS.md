# Global asset monitors

The authenticated workspace groups market context into one monitor family at
`/app/monitors`. The existing Crypto Research Monitor remains the dedicated
digital-assets view; the other global asset classes use the normalized Go
endpoint `GET /v1/market-monitors/:class`.

## Free public data sources

| Monitor | Source | What the rows represent |
| --- | --- | --- |
| Equities, funds, fixed income, commodities, real estate, derivatives, private markets, cash/rates, protection/contracts | Yahoo Finance public chart response | Listed instruments, indexes, futures, or clearly-labelled listed proxies |
| Currencies | Frankfurter API backed by central-bank reference data | Daily reference rates, quoted as `1 USD = quoted currency units` |
| Digital assets | Existing OKX and supported public exchange adapters | Public spot markets with the existing VargaTrend research record |

No provider key is required for the new monitor family. Public quote feeds may
be delayed, end-of-day, rate-limited, or unavailable for a symbol. The API
returns row timestamps, source URLs, coverage, quote convention, and failure
reasons so the UI never turns a missing value into a fabricated number.

Private equity, venture capital, private debt, annuities, insurance contracts,
pensions, and structured products do not have a universal free continuous
quote feed. Their monitors therefore show public listed proxies and say so in
the row and class metadata. They do not estimate private NAV, contract terms,
guarantees, or suitability.

The monitor family is research and decision support only. It does not execute
orders or make buy, sell, hold, or personalized-advice claims.
