const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTS(relativePath, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = function (name) {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    return Module.prototype.require.call(this, name);
  };
  loaded._compile(compiled, filename);
  return loaded.exports;
}
const makeProduct = (id) => ({ _id: id, name: 'Product ' + id });
const page = (products, currentPage = 1, pages = 2) => ({
  products, pagination: { page: currentPage, limit: 20, total: 39, pages },
});
function makeStore(getProducts) {
  return loadTS('src/store/productsStore.ts', {
    '../services/productsService': { productsService: {
      getProducts, getCategories: async () => ['Mass Gainer', 'Whey Protein'], getFeaturedProducts: async () => [],
    } },
  }).useProductsStore;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('API categories retain their exact request values, including new categories', () => {
  const { getProductCategoryOptions } = loadTS('src/utils/productCategories.ts');
  const options = getProductCategoryOptions(['Mass Gainer', 'Whey Isolate', 'Créatine', 'Mass Gainer']);
  assert.equal(options.find((option) => option.label === 'Mass Gainer').id, 'Mass Gainer');
  assert.ok(options.some((option) => option.id === 'Créatine'));
  assert.equal(options.filter((option) => option.id === 'Mass Gainer').length, 1);
  assert.deepEqual(getProductCategoryOptions([]), [{ id: '', label: 'Tout' }]);
});

test('category, search, stock, price and sorting reach the service together', async () => {
  let received;
  const store = makeStore(async (filters) => { received = filters; return page([makeProduct('gainer')]); });
  store.getState().setFilters({ category: 'Mass Gainer', search: 'Serious', inStock: true, minPrice: 20, sort: 'price-asc' });
  await store.getState().fetchProducts();
  assert.deepEqual(received, { page: 1, limit: 20, category: 'Mass Gainer', search: 'Serious', inStock: true, minPrice: 20, sort: 'price-asc' });
  store.getState().setFilters({ category: undefined });
  assert.equal(store.getState().filters.inStock, true);
  assert.equal(store.getState().filters.search, 'Serious');
});

test('late responses cannot replace results for the latest filter', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const store = makeStore(() => (++calls === 1 ? first.promise : second.promise));
  const oldRequest = store.getState().fetchProducts({ category: 'Whey Protein' });
  const newRequest = store.getState().fetchProducts({ category: 'Mass Gainer' });
  second.resolve(page([makeProduct('gainer')]));
  await newRequest;
  first.resolve(page([makeProduct('whey')]));
  await oldRequest;
  assert.equal(store.getState().products[0]._id, 'gainer');
  assert.equal(store.getState().filters.category, 'Mass Gainer');
});

test('a changed filter invalidates an outstanding request even before the next fetch', async () => {
  const old = deferred();
  const store = makeStore(() => old.promise);
  const request = store.getState().fetchProducts({ category: 'Whey Protein' });
  store.getState().setFilters({ category: 'Mass Gainer' });
  old.resolve(page([makeProduct('whey')]));
  await request;
  assert.equal(store.getState().filters.category, 'Mass Gainer');
  assert.equal(store.getState().products.length, 0);
});

test('tapping an already selected category does not cancel its pending request', async () => {
  const result = deferred();
  const store = makeStore(() => result.promise);
  store.getState().setFilters({ category: 'Mass Gainer' });
  const request = store.getState().fetchProducts();
  store.getState().setFilters({ category: 'Mass Gainer', page: 1 });
  result.resolve(page([makeProduct('gainer')]));
  await request;
  assert.equal(store.getState().products.length, 1);
});

test('pagination keeps filters, appends products and removes duplicates', async () => {
  const calls = [];
  const store = makeStore(async (filters) => {
    calls.push(filters);
    return filters.page === 2 ? page([makeProduct('a'), makeProduct('b')], 2) : page([makeProduct('a')]);
  });
  await store.getState().fetchProducts({ category: 'Mass Gainer', inStock: true, sort: 'price-desc', page: 1 });
  await store.getState().loadMoreProducts();
  assert.deepEqual(store.getState().products.map((product) => product._id), ['a', 'b']);
  assert.equal(calls[1].page, 2);
  assert.equal(calls[1].category, 'Mass Gainer');
  assert.equal(calls[1].inStock, true);
  assert.equal(calls[1].sort, 'price-desc');
  await store.getState().loadMoreProducts();
  assert.equal(calls.length, 2);
});

test('a failed next page keeps existing products and offers a separate retry state', async () => {
  const store = makeStore(async (filters) => {
    if (filters.page === 2) throw new Error('Offline');
    return page([makeProduct('a')]);
  });
  await store.getState().fetchProducts({ page: 1 });
  await store.getState().loadMoreProducts();
  assert.equal(store.getState().products.length, 1);
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().loadMoreError, 'Offline');
  assert.equal(store.getState().loadingMore, false);
});

