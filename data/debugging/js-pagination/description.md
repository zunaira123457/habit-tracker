# Missing first page

A store lists products 3 per page.

## Files
- `models/product.js`: a `Product` with an id and name
- `services/products.js`: `listProducts(products, page)`
- `utils/paginate.js`: generic pagination helpers

## Expected behavior
- Pages are **1-based**: page 1 shows items 1–3, page 2 shows items 4–6, and so on.
- `listProducts` returns `{ items, page, totalPages, hasNext }`.
- A page past the end returns an empty `items` list.

## Bug report
> Page 1 shows products 4–6. Products 1–3 never appear anywhere.

There is **1 bug**.
