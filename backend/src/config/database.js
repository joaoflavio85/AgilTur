const { PrismaClient } = require('@prisma/client');
const { getTenantId } = require('./tenant-context');

const rawPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const TENANT_MODELS = new Set([
  'Usuario',
  'Cliente',
  'Operadora',
  'ModeloPosVenda',
  'Proposta',
  'MotivoPerdaProposta',
  'Venda',
  'ContaReceber',
  'VendaPagamento',
  'ContaPagar',
  'CentroCusto',
  'PosVenda',
  'ConfiguracaoWhatsApp',
  'AuditoriaEvento',
]);

const getDelegate = (modelName) => {
  if (!modelName) return null;
  const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return rawPrisma[delegateName] || null;
};

const mergeTenantWhere = (where, tenantId) => {
  if (!tenantId) return where;
  if (!where) return { empresaId: tenantId };
  return { AND: [where, { empresaId: tenantId }] };
};

const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = getTenantId();

        if (!tenantId || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(operation)) {
          args.where = mergeTenantWhere(args.where, tenantId);
          return query(args);
        }

        if (operation === 'create') {
          args.data = { ...(args.data || {}), empresaId: tenantId };
          return query(args);
        }

        if (operation === 'createMany') {
          const data = Array.isArray(args.data) ? args.data : [args.data];
          args.data = data.map((item) => ({ ...(item || {}), empresaId: tenantId }));
          return query(args);
        }

        if (operation === 'upsert') {
          args.create = { ...(args.create || {}), empresaId: tenantId };
          args.update = { ...(args.update || {}), empresaId: tenantId };
          return query(args);
        }

        if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
          const delegate = getDelegate(model);
          if (delegate?.findFirst) {
            const where = mergeTenantWhere(args.where, tenantId);
            return delegate.findFirst({
              ...args,
              where,
            });
          }
          return query(args);
        }

        if (operation === 'update' || operation === 'delete') {
          const delegate = getDelegate(model);
          if (delegate?.findFirst) {
            const existente = await delegate.findFirst({
              where: mergeTenantWhere(args.where, tenantId),
              select: { id: true },
            });

            if (!existente) {
              const err = new Error('Registro nao encontrado no tenant atual.');
              err.statusCode = 404;
              throw err;
            }
          }
          return query(args);
        }

        return query(args);
      },
    },
  },
});

module.exports = prisma;
