# Solution

## Bug 1: 0-based math on 1-based pages, in `utils/paginate.js`
`start = page * pageSize` treats `page` as 0-based, so page 1 starts at index 3.

**Fix:** `start = (page - 1) * pageSize`.

**Root cause vs. symptom:** the symptom is in the product list, but the cause is the shared helper. Passing `page - 1` from `services/products.js` fixes this one caller and leaves the helper's 1-based contract wrong.
