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
  'IndicacaoCliente',
  'Brinde',
  'BrindeMovimentacao',
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

const ensureIndicacoesSchema = async () => {
  try {
    await rawPrisma.$executeRawUnsafe(`
IF COL_LENGTH('vendas', 'clienteIndicadorId') IS NULL
  ALTER TABLE vendas ADD clienteIndicadorId INT NULL;

IF COL_LENGTH('vendas', 'vendaPorIndicacao') IS NULL
  ALTER TABLE vendas ADD vendaPorIndicacao BIT NOT NULL CONSTRAINT DF_vendas_vendaPorIndicacao DEFAULT(0);

IF OBJECT_ID('indicacoes_clientes', 'U') IS NULL
BEGIN
  CREATE TABLE indicacoes_clientes (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    empresaId INT NULL,
    clienteIndicadorId INT NOT NULL,
    clienteIndicadoId INT NOT NULL,
    vendaId INT NOT NULL UNIQUE,
    valorComissaoVenda DECIMAL(10,2) NOT NULL CONSTRAINT DF_indicacoes_valorComissao DEFAULT(0),
    bonificacaoGerada DECIMAL(10,2) NOT NULL CONSTRAINT DF_indicacoes_bonificacao DEFAULT(0),
    percentualBonificacaoAplicado DECIMAL(5,2) NOT NULL CONSTRAINT DF_indicacoes_percentual DEFAULT(5),
    statusBonificacao NVARCHAR(20) NOT NULL CONSTRAINT DF_indicacoes_status DEFAULT('PENDENTE'),
    dataPagamentoBonificacao DATETIME2 NULL,
    observacoes NVARCHAR(1000) NULL,
    dataIndicacao DATETIME2 NOT NULL CONSTRAINT DF_indicacoes_dataIndicacao DEFAULT(SYSDATETIME()),
    dataCriacao DATETIME2 NOT NULL CONSTRAINT DF_indicacoes_dataCriacao DEFAULT(SYSDATETIME())
  );
END;

IF COL_LENGTH('indicacoes_clientes', 'percentualBonificacaoAplicado') IS NULL
  ALTER TABLE indicacoes_clientes ADD percentualBonificacaoAplicado DECIMAL(5,2) NOT NULL CONSTRAINT DF_indicacoes_percentual_v2 DEFAULT(5);

IF COL_LENGTH('indicacoes_clientes', 'dataPagamentoBonificacao') IS NULL
  ALTER TABLE indicacoes_clientes ADD dataPagamentoBonificacao DATETIME2 NULL;

IF COL_LENGTH('empresas', 'percentualBonificacaoIndicacao') IS NULL
  ALTER TABLE empresas ADD percentualBonificacaoIndicacao DECIMAL(5,2) NOT NULL CONSTRAINT DF_empresas_percentualBonificacaoIndicacao DEFAULT(5);

IF OBJECT_ID('brindes', 'U') IS NULL
BEGIN
  CREATE TABLE brindes (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    empresaId INT NULL,
    nome NVARCHAR(150) NOT NULL,
    estoque INT NOT NULL CONSTRAINT DF_brindes_estoque DEFAULT(0),
    estoqueMinimo INT NOT NULL CONSTRAINT DF_brindes_estoqueMinimo DEFAULT(0),
    custoMedio DECIMAL(10,2) NOT NULL CONSTRAINT DF_brindes_custoMedio DEFAULT(0),
    dataCriacao DATETIME2 NOT NULL CONSTRAINT DF_brindes_dataCriacao DEFAULT(SYSDATETIME())
  );
END;

IF OBJECT_ID('brinde_movimentacao', 'U') IS NULL
BEGIN
  CREATE TABLE brinde_movimentacao (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    empresaId INT NULL,
    brindeId INT NOT NULL,
    tipo NVARCHAR(10) NOT NULL,
    quantidade INT NOT NULL,
    custoUnitario DECIMAL(10,2) NOT NULL,
    valorTotal DECIMAL(10,2) NOT NULL,
    dataMovimentacao DATETIME2 NOT NULL CONSTRAINT DF_brinde_mov_data DEFAULT(SYSDATETIME()),
    fornecedorNome NVARCHAR(150) NULL,
    clienteNome NVARCHAR(150) NULL,
    vendaId INT NULL,
    despesaId INT NULL,
    observacao NVARCHAR(255) NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_brinde_movimentacao_brinde')
  ALTER TABLE brinde_movimentacao ADD CONSTRAINT FK_brinde_movimentacao_brinde FOREIGN KEY (brindeId) REFERENCES brindes(id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_brinde_movimentacao_brinde_data' AND object_id = OBJECT_ID('brinde_movimentacao'))
  CREATE INDEX IX_brinde_movimentacao_brinde_data ON brinde_movimentacao(brindeId, dataMovimentacao);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_vendas_clienteIndicador')
  ALTER TABLE vendas ADD CONSTRAINT FK_vendas_clienteIndicador FOREIGN KEY (clienteIndicadorId) REFERENCES clientes(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_indicacoes_clienteIndicador')
  ALTER TABLE indicacoes_clientes ADD CONSTRAINT FK_indicacoes_clienteIndicador FOREIGN KEY (clienteIndicadorId) REFERENCES clientes(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_indicacoes_clienteIndicado')
  ALTER TABLE indicacoes_clientes ADD CONSTRAINT FK_indicacoes_clienteIndicado FOREIGN KEY (clienteIndicadoId) REFERENCES clientes(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_indicacoes_venda')
  ALTER TABLE indicacoes_clientes ADD CONSTRAINT FK_indicacoes_venda FOREIGN KEY (vendaId) REFERENCES vendas(id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_indicacoes_clienteIndicador' AND object_id = OBJECT_ID('indicacoes_clientes'))
  CREATE INDEX IX_indicacoes_clienteIndicador ON indicacoes_clientes(clienteIndicadorId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_indicacoes_clienteIndicado' AND object_id = OBJECT_ID('indicacoes_clientes'))
  CREATE INDEX IX_indicacoes_clienteIndicado ON indicacoes_clientes(clienteIndicadoId);
`);
  } catch (error) {
    console.warn('Nao foi possivel garantir schema de indicacoes automaticamente:', error?.message || error);
  }
};

ensureIndicacoesSchema();

module.exports = prisma;
