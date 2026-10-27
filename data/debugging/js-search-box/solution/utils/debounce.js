// Call fn once, with the last arguments, after calls stop for `ms` milliseconds.
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

module.exports = { debounce };
