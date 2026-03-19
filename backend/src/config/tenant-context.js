const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

const runWithTenant = (tenantId, fn) => als.run({ tenantId: tenantId ? Number(tenantId) : null }, fn);

const getTenantId = () => {
  const store = als.getStore();
  return store?.tenantId ? Number(store.tenantId) : null;
};

const setTenantId = (tenantId) => {
  const store = als.getStore();
  if (!store) return;
  store.tenantId = tenantId ? Number(tenantId) : null;
};

module.exports = {
  runWithTenant,
  getTenantId,
  setTenantId,
};
