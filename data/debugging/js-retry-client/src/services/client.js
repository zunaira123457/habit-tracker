const { withRetry } = require('../utils/retry');
const { User } = require('../models/user');

const RETRIES = 2;

async function fetchUser(api, id) {
  const data = await withRetry(() => api.get(`/users/${id}`), RETRIES);
  return new User(data);
}

module.exports = { fetchUser, RETRIES };
