const { paginate, pageCount } = require('../utils/paginate');

const PAGE_SIZE = 3;

function listProducts(products, page) {
  const totalPages = pageCount(products, PAGE_SIZE);
  return { items: paginate(products, page, PAGE_SIZE), page, totalPages, hasNext: page < totalPages };
}

module.exports = { listProducts, PAGE_SIZE };
