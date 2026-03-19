-- =============================================
-- Script SQL Server - Aramé Turismo
-- Execute este script antes do Prisma migrate
-- =============================================

-- Criar banco de dados
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'arame_turismo')
BEGIN
    CREATE DATABASE arame_turismo;
END
GO

USE arame_turismo;
GO

-- =============================================
-- Enums como tabelas de lookup (ou use os valores diretamente)
-- O Prisma vai criar as tabelas via migrate dev
-- Este script é alternativo/complementar
-- =============================================

-- Tabela Usuarios
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios')
BEGIN
    CREATE TABLE usuarios (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        nome          NVARCHAR(150) NOT NULL,
        email         NVARCHAR(200) NOT NULL UNIQUE,
        senha         NVARCHAR(255) NOT NULL,
        telefone      NVARCHAR(20),
        perfil        NVARCHAR(10) NOT NULL DEFAULT 'AGENTE' CHECK (perfil IN ('ADMIN','AGENTE')),
        ativo         BIT NOT NULL DEFAULT 1,
        dataCriacao   DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabela usuarios criada.';
END
GO

-- Tabela Clientes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clientes')
BEGIN
    CREATE TABLE clientes (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        nome           NVARCHAR(150) NOT NULL,
        cpf            NVARCHAR(14) NOT NULL UNIQUE,
        rg             NVARCHAR(20),
        dataNascimento DATETIME2,
        telefone       NVARCHAR(20),
        email          NVARCHAR(200),
        endereco       NVARCHAR(500),
        observacoes    NVARCHAR(1000),
        dataCadastro   DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabela clientes criada.';
END
GO

-- Tabela Operadoras (Fornecedores)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'operadoras')
BEGIN
    CREATE TABLE operadoras (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        nome         NVARCHAR(150) NOT NULL,
        cnpj         NVARCHAR(18) UNIQUE,
        telefone     NVARCHAR(20),
        email        NVARCHAR(200),
        ativo        BIT NOT NULL DEFAULT 1,
        dataCadastro DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabela operadoras criada.';
END
GO

-- Tabela Vendas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vendas')
BEGIN
    CREATE TABLE vendas (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        propostaId       INT NULL UNIQUE,
        clienteId        INT NOT NULL,
        agenteId         INT NOT NULL,
        operadoraId      INT NULL,
        idReserva        NVARCHAR(20) NULL,
        tipoServico      NVARCHAR(20) NOT NULL CHECK (tipoServico IN ('AEREO','HOTEL','PACOTE','CRUZEIRO','RODOVIARIO','SEGURO_VIAGEM','OUTROS')),
        descricao        NVARCHAR(1000) NOT NULL,
        observacoes      NVARCHAR(1000),
        anexoPdfNome     NVARCHAR(255) NULL,
        anexoPdfPath     NVARCHAR(500) NULL,
        valorTotal       DECIMAL(10,2) NOT NULL,
        valorComissao    DECIMAL(10,2) NOT NULL DEFAULT 0,
        status           NVARCHAR(10) NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','PAGA','CANCELADA')),
        dataVenda        DATETIME2 NOT NULL DEFAULT GETDATE(),
        dataViagemInicio DATETIME2,
        dataViagemFim    DATETIME2,
        CONSTRAINT FK_vendas_clientes FOREIGN KEY (clienteId) REFERENCES clientes(id),
        CONSTRAINT FK_vendas_usuarios FOREIGN KEY (agenteId) REFERENCES usuarios(id),
        CONSTRAINT FK_vendas_operadoras FOREIGN KEY (operadoraId) REFERENCES operadoras(id)
    );
    PRINT 'Tabela vendas criada.';
END
GO

-- Tabela Propostas (Pipeline Comercial)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'propostas')
BEGIN
    CREATE TABLE propostas (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        clienteId        INT NOT NULL,
        agenteId         INT NOT NULL,
        operadoraId      INT NULL,
        idReserva        NVARCHAR(20) NULL,
        etapa            NVARCHAR(20) NOT NULL DEFAULT 'LEAD' CHECK (etapa IN ('LEAD','COTACAO','RESERVA','VENDA')),
        status           NVARCHAR(15) NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','FECHADA','PERDIDA')),
        tipoServico      NVARCHAR(20) NOT NULL CHECK (tipoServico IN ('AEREO','HOTEL','PACOTE','CRUZEIRO','RODOVIARIO','SEGURO_VIAGEM','OUTROS')),
        descricao        NVARCHAR(1000) NOT NULL,
        observacoes      NVARCHAR(1000) NULL,
        motivoPerda      NVARCHAR(500) NULL,
        valorEstimado    DECIMAL(10,2) NOT NULL,
        valorComissao    DECIMAL(10,2) NOT NULL DEFAULT 0,
        dataViagemInicio DATETIME2 NULL,
        dataViagemFim    DATETIME2 NULL,
        dataCriacao      DATETIME2 NOT NULL DEFAULT GETDATE(),
        proximaAcaoEm    DATETIME2 NULL,
        dataFechamento   DATETIME2 NULL,
        dataPerda        DATETIME2 NULL,
        CONSTRAINT FK_propostas_clientes FOREIGN KEY (clienteId) REFERENCES clientes(id),
        CONSTRAINT FK_propostas_usuarios FOREIGN KEY (agenteId) REFERENCES usuarios(id),
        CONSTRAINT FK_propostas_operadoras FOREIGN KEY (operadoraId) REFERENCES operadoras(id)
    );
    PRINT 'Tabela propostas criada.';
END
GO

IF COL_LENGTH('propostas', 'motivoPerda') IS NULL
BEGIN
    ALTER TABLE propostas ADD motivoPerda NVARCHAR(500) NULL;
    PRINT 'Coluna propostas.motivoPerda adicionada.';
END
GO

IF COL_LENGTH('propostas', 'dataPerda') IS NULL
BEGIN
    ALTER TABLE propostas ADD dataPerda DATETIME2 NULL;
    PRINT 'Coluna propostas.dataPerda adicionada.';
END
GO

IF COL_LENGTH('propostas', 'proximaAcaoEm') IS NULL
BEGIN
    ALTER TABLE propostas ADD proximaAcaoEm DATETIME2 NULL;
    PRINT 'Coluna propostas.proximaAcaoEm adicionada.';
END
GO

DECLARE @sqlDropEtapa NVARCHAR(MAX) = N'';
SELECT @sqlDropEtapa = @sqlDropEtapa + N'ALTER TABLE propostas DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID('propostas')
    AND cc.definition LIKE '%etapa%';

IF LEN(@sqlDropEtapa) > 0
BEGIN
        EXEC sp_executesql @sqlDropEtapa;
END
GO

ALTER TABLE propostas
ADD CONSTRAINT CK_propostas_etapa CHECK (etapa IN ('LEAD','COTACAO','RESERVA','VENDA','PROPOSTA','NEGOCIACAO'));
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'motivos_perda_proposta')
BEGIN
    CREATE TABLE motivos_perda_proposta (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        descricao   NVARCHAR(120) NOT NULL UNIQUE,
        ativo       BIT NOT NULL DEFAULT 1,
        dataCriacao DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabela motivos_perda_proposta criada.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empresas')
BEGIN
    CREATE TABLE empresas (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        razaoSocial     NVARCHAR(200) NOT NULL,
        nomeFantasia    NVARCHAR(200) NULL,
        cnpj            NVARCHAR(18) NULL,
        subdominio      NVARCHAR(80) NULL,
        email           NVARCHAR(200) NULL,
        telefone        NVARCHAR(20) NULL,
        asaasApiKey     NVARCHAR(255) NULL,
        asaasBaseUrl    NVARCHAR(255) NULL,
        asaasSandbox    BIT NOT NULL DEFAULT 1,
        ativo           BIT NOT NULL DEFAULT 1,
        dataCriacao     DATETIME2 NOT NULL DEFAULT GETDATE(),
        dataAtualizacao DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabela empresas criada.';
END
GO

IF COL_LENGTH('empresas', 'subdominio') IS NULL
BEGIN
    ALTER TABLE empresas ADD subdominio NVARCHAR(80) NULL;
    PRINT 'Coluna empresas.subdominio adicionada.';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_empresas_subdominio'
      AND object_id = OBJECT_ID('empresas')
)
BEGIN
    CREATE UNIQUE INDEX UX_empresas_subdominio
    ON empresas(subdominio)
    WHERE subdominio IS NOT NULL;
    PRINT 'Indice unico UX_empresas_subdominio criado.';
END
GO

IF COL_LENGTH('vendas', 'propostaId') IS NULL
BEGIN
    ALTER TABLE vendas ADD propostaId INT NULL;
    PRINT 'Coluna vendas.propostaId adicionada.';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_vendas_propostaId'
      AND object_id = OBJECT_ID('vendas')
)
BEGIN
    CREATE UNIQUE INDEX UX_vendas_propostaId ON vendas(propostaId) WHERE propostaId IS NOT NULL;
    PRINT 'Indice unico UX_vendas_propostaId criado.';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_vendas_propostas'
)
BEGIN
    ALTER TABLE vendas
    ADD CONSTRAINT FK_vendas_propostas FOREIGN KEY (propostaId) REFERENCES propostas(id);
    PRINT 'FK FK_vendas_propostas criada.';
END
GO

IF COL_LENGTH('vendas', 'valorComissao') IS NULL
BEGIN
    ALTER TABLE vendas ADD valorComissao DECIMAL(10,2) NOT NULL CONSTRAINT DF_vendas_valorComissao DEFAULT 0;
    PRINT 'Coluna vendas.valorComissao adicionada.';
END
GO

IF COL_LENGTH('vendas', 'operadoraId') IS NULL
BEGIN
    ALTER TABLE vendas ADD operadoraId INT NULL;
    PRINT 'Coluna vendas.operadoraId adicionada.';
END
GO

IF COL_LENGTH('vendas', 'idReserva') IS NULL
BEGIN
    ALTER TABLE vendas ADD idReserva NVARCHAR(20) NULL;
    PRINT 'Coluna vendas.idReserva adicionada.';
END
GO

IF COL_LENGTH('vendas', 'observacoes') IS NULL
BEGIN
    ALTER TABLE vendas ADD observacoes NVARCHAR(1000) NULL;
    PRINT 'Coluna vendas.observacoes adicionada.';
END
GO

IF COL_LENGTH('vendas', 'anexoPdfNome') IS NULL
BEGIN
    ALTER TABLE vendas ADD anexoPdfNome NVARCHAR(255) NULL;
    PRINT 'Coluna vendas.anexoPdfNome adicionada.';
END
GO

IF COL_LENGTH('vendas', 'anexoPdfPath') IS NULL
BEGIN
    ALTER TABLE vendas ADD anexoPdfPath NVARCHAR(500) NULL;
    PRINT 'Coluna vendas.anexoPdfPath adicionada.';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_vendas_operadoras'
)
BEGIN
    ALTER TABLE vendas
    ADD CONSTRAINT FK_vendas_operadoras FOREIGN KEY (operadoraId) REFERENCES operadoras(id);
    PRINT 'FK FK_vendas_operadoras criada.';
END
GO

IF EXISTS (SELECT 1 FROM vendas WHERE operadoraId IS NULL)
BEGIN
    PRINT 'Atenção: existem vendas sem operadoraId. Ajuste os dados antes de tornar a coluna obrigatória.';
END
GO

IF EXISTS (SELECT 1 FROM vendas WHERE idReserva IS NULL)
BEGIN
    PRINT 'Atenção: existem vendas sem idReserva. Ajuste os dados antes de tornar a coluna obrigatória.';
END
GO

-- Tabela de Formas de Pagamento por Venda
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'venda_pagamentos')
BEGIN
    CREATE TABLE venda_pagamentos (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        vendaId        INT NOT NULL,
        formaPagamento NVARCHAR(20) NOT NULL CHECK (formaPagamento IN ('CARTAO','BOLETO','PIX','OPERADORA')),
        valor          DECIMAL(10,2) NOT NULL,
        dataVencimento DATETIME2,
        dataCriacao    DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_venda_pagamentos_vendas FOREIGN KEY (vendaId) REFERENCES vendas(id) ON DELETE CASCADE
    );
    PRINT 'Tabela venda_pagamentos criada.';
END
GO

IF COL_LENGTH('venda_pagamentos', 'dataVencimento') IS NULL
BEGIN
    ALTER TABLE venda_pagamentos ADD dataVencimento DATETIME2 NULL;
    PRINT 'Coluna venda_pagamentos.dataVencimento adicionada.';
END
GO

-- Tabela Contas a Receber
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'contas_receber')
BEGIN
    CREATE TABLE contas_receber (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        vendaId        INT NOT NULL,
        valor          DECIMAL(10,2) NOT NULL,
        formaPagamento NVARCHAR(20),
        origem         NVARCHAR(20) NOT NULL DEFAULT 'MANUAL',
        dataVencimento DATETIME2 NOT NULL,
        dataPagamento  DATETIME2,
        status         NVARCHAR(10) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
        CONSTRAINT FK_contas_receber_vendas FOREIGN KEY (vendaId) REFERENCES vendas(id)
    );
    PRINT 'Tabela contas_receber criada.';
END
GO

DECLARE @sqlDropCr NVARCHAR(MAX) = N'';
SELECT @sqlDropCr = @sqlDropCr + N'ALTER TABLE contas_receber DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID('contas_receber')
  AND cc.definition LIKE '%status%';

IF LEN(@sqlDropCr) > 0
BEGIN
    EXEC sp_executesql @sqlDropCr;
END
GO

ALTER TABLE contas_receber
ADD CONSTRAINT CK_contas_receber_status CHECK (status IN ('PENDENTE','PAGO','ATRASADO','CANCELADO'));
GO

IF COL_LENGTH('contas_receber', 'formaPagamento') IS NULL
BEGIN
    ALTER TABLE contas_receber ADD formaPagamento NVARCHAR(20) NULL;
    PRINT 'Coluna contas_receber.formaPagamento adicionada.';
END
GO

IF COL_LENGTH('contas_receber', 'origem') IS NULL
BEGIN
    ALTER TABLE contas_receber ADD origem NVARCHAR(20) NOT NULL CONSTRAINT DF_contas_receber_origem DEFAULT 'MANUAL';
    PRINT 'Coluna contas_receber.origem adicionada.';
END
GO

-- Tabela Contas a Pagar
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'centros_custo')
BEGIN
    CREATE TABLE centros_custo (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        descricao   NVARCHAR(150) NOT NULL UNIQUE,
        ativo       BIT NOT NULL DEFAULT 1,
        dataCriacao DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Tabela centros_custo criada.';
END
GO

IF NOT EXISTS (SELECT 1 FROM centros_custo)
BEGIN
    INSERT INTO centros_custo (descricao, ativo) VALUES ('GERAL', 1);
    PRINT 'Centro de custo padrao inserido.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'contas_pagar')
BEGIN
    CREATE TABLE contas_pagar (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        centroCustoId  INT NOT NULL,
        descricao      NVARCHAR(500) NOT NULL,
        fornecedor     NVARCHAR(150) NOT NULL,
        valor          DECIMAL(10,2) NOT NULL,
        dataVencimento DATETIME2 NOT NULL,
        dataPagamento  DATETIME2,
        status         NVARCHAR(10) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
        CONSTRAINT FK_contas_pagar_centros_custo FOREIGN KEY (centroCustoId) REFERENCES centros_custo(id)
    );
    PRINT 'Tabela contas_pagar criada.';
END
GO

IF COL_LENGTH('contas_pagar', 'centroCustoId') IS NULL
BEGIN
    ALTER TABLE contas_pagar ADD centroCustoId INT NULL;
    PRINT 'Coluna contas_pagar.centroCustoId adicionada.';
END
GO

DECLARE @centroPadraoId INT;
SELECT TOP 1 @centroPadraoId = id FROM centros_custo ORDER BY id;

IF @centroPadraoId IS NOT NULL
BEGIN
    UPDATE contas_pagar
    SET centroCustoId = @centroPadraoId
    WHERE centroCustoId IS NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('contas_pagar') AND name = 'centroCustoId' AND is_nullable = 1)
BEGIN
    ALTER TABLE contas_pagar ALTER COLUMN centroCustoId INT NOT NULL;
    PRINT 'Coluna contas_pagar.centroCustoId alterada para NOT NULL.';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_contas_pagar_centros_custo'
)
BEGIN
    ALTER TABLE contas_pagar
    ADD CONSTRAINT FK_contas_pagar_centros_custo FOREIGN KEY (centroCustoId) REFERENCES centros_custo(id);
    PRINT 'FK FK_contas_pagar_centros_custo criada.';
END
GO

DECLARE @sqlDropCp NVARCHAR(MAX) = N'';
SELECT @sqlDropCp = @sqlDropCp + N'ALTER TABLE contas_pagar DROP CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID('contas_pagar')
  AND cc.definition LIKE '%status%';

IF LEN(@sqlDropCp) > 0
BEGIN
    EXEC sp_executesql @sqlDropCp;
END
GO

ALTER TABLE contas_pagar
ADD CONSTRAINT CK_contas_pagar_status CHECK (status IN ('PENDENTE','PAGO','ATRASADO','CANCELADO'));
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'auditoria_eventos')
BEGIN
    CREATE TABLE auditoria_eventos (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        entidade      NVARCHAR(80) NOT NULL,
        acao          NVARCHAR(60) NOT NULL,
        registroId    INT NULL,
        usuarioId     INT NULL,
        usuarioNome   NVARCHAR(150) NULL,
        usuarioEmail  NVARCHAR(200) NULL,
        usuarioPerfil NVARCHAR(20) NULL,
        antesJson     NVARCHAR(4000) NULL,
        depoisJson    NVARCHAR(4000) NULL,
        metadadosJson NVARCHAR(4000) NULL,
        dataEvento    DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_auditoria_eventos_dataEvento ON auditoria_eventos (dataEvento DESC);
    CREATE INDEX IX_auditoria_eventos_entidade_dataEvento ON auditoria_eventos (entidade, dataEvento DESC);

    PRINT 'Tabela auditoria_eventos criada.';
END
GO

-- Tabela Pós-Venda
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pos_vendas')
BEGIN
    CREATE TABLE pos_vendas (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        vendaId     INT NOT NULL,
        tipoAcao    NVARCHAR(20) NOT NULL CHECK (tipoAcao IN ('TROCA_RESERVA','CANCELAMENTO','EMISSAO_VOUCHER','ENTREGA_BRINDE','CHECKIN_VOO')),
        descricao   NVARCHAR(1000) NOT NULL,
        dataAcao    DATETIME2 NOT NULL DEFAULT GETDATE(),
        responsavel NVARCHAR(150) NOT NULL,
        status      NVARCHAR(15) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','CONCLUIDO')),
        CONSTRAINT FK_pos_vendas_vendas FOREIGN KEY (vendaId) REFERENCES vendas(id)
    );
    PRINT 'Tabela pos_vendas criada.';
END
GO

IF COL_LENGTH('pos_vendas', 'status') IS NULL
BEGIN
    ALTER TABLE pos_vendas ADD status NVARCHAR(15) NULL;
    UPDATE pos_vendas SET status = 'ABERTO' WHERE status IS NULL;
    ALTER TABLE pos_vendas ALTER COLUMN status NVARCHAR(15) NOT NULL;
    ALTER TABLE pos_vendas ADD CONSTRAINT DF_pos_vendas_status DEFAULT 'ABERTO' FOR status;
    ALTER TABLE pos_vendas ADD CONSTRAINT CK_pos_vendas_status CHECK (status IN ('ABERTO','CONCLUIDO'));
    PRINT 'Coluna status adicionada em pos_vendas.';
END
GO

-- Tabela Modelos de Pos-Venda
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'modelos_pos_venda')
BEGIN
    CREATE TABLE modelos_pos_venda (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        tipoServico     NVARCHAR(20) NOT NULL CHECK (tipoServico IN ('AEREO','HOTEL','PACOTE','CRUZEIRO','RODOVIARIO','SEGURO_VIAGEM','OUTROS')),
        operadoraId     INT NULL,
        tipoAcao        NVARCHAR(20) NOT NULL CHECK (tipoAcao IN ('TROCA_RESERVA','CANCELAMENTO','EMISSAO_VOUCHER','ENTREGA_BRINDE','CHECKIN_VOO')),
        descricaoPadrao NVARCHAR(1000) NOT NULL,
        ordem           INT NOT NULL DEFAULT 1,
        ativo           BIT NOT NULL DEFAULT 1,
        dataCriacao     DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_modelos_pos_venda_operadoras FOREIGN KEY (operadoraId) REFERENCES operadoras(id)
    );

    CREATE INDEX IX_modelos_pos_venda_tipo_operadora_ativo_ordem
        ON modelos_pos_venda (tipoServico, operadoraId, ativo, ordem);

    PRINT 'Tabela modelos_pos_venda criada.';
END
GO

-- Tabela Configuração WhatsApp
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'configuracao_whatsapp')
BEGIN
    CREATE TABLE configuracao_whatsapp (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        mensagemPadrao NVARCHAR(1000) NOT NULL,
        ativo          BIT NOT NULL DEFAULT 1
    );

    -- Inserir configuração padrão
    INSERT INTO configuracao_whatsapp (mensagemPadrao, ativo)
    VALUES (N'Olá {nome}! Sua viagem para {destino} está confirmada para {data}. Qualquer dúvida, entre em contato com a Aramé Turismo. Boa viagem! 🌎', 1);

    PRINT 'Tabela configuracao_whatsapp criada.';
END
GO

-- =============================================
-- Modo SaaS: colunas empresaId para isolamento multi-tenant
-- =============================================

IF NOT EXISTS (SELECT 1 FROM empresas)
BEGIN
    INSERT INTO empresas (razaoSocial, ativo, asaasSandbox)
    VALUES (N'Empresa Padrao', 1, 1);
    PRINT 'Empresa padrao criada para suporte multi-tenant.';
END
GO

DECLARE @empresaPadraoId INT;
SELECT TOP 1 @empresaPadraoId = id FROM empresas WHERE ativo = 1 ORDER BY id;

IF @empresaPadraoId IS NULL
BEGIN
    SELECT TOP 1 @empresaPadraoId = id FROM empresas ORDER BY id;
END
GO

IF COL_LENGTH('usuarios', 'empresaId') IS NULL BEGIN ALTER TABLE usuarios ADD empresaId INT NULL; END
IF COL_LENGTH('clientes', 'empresaId') IS NULL BEGIN ALTER TABLE clientes ADD empresaId INT NULL; END
IF COL_LENGTH('operadoras', 'empresaId') IS NULL BEGIN ALTER TABLE operadoras ADD empresaId INT NULL; END
IF COL_LENGTH('propostas', 'empresaId') IS NULL BEGIN ALTER TABLE propostas ADD empresaId INT NULL; END
IF COL_LENGTH('motivos_perda_proposta', 'empresaId') IS NULL BEGIN ALTER TABLE motivos_perda_proposta ADD empresaId INT NULL; END
IF COL_LENGTH('vendas', 'empresaId') IS NULL BEGIN ALTER TABLE vendas ADD empresaId INT NULL; END
IF COL_LENGTH('contas_receber', 'empresaId') IS NULL BEGIN ALTER TABLE contas_receber ADD empresaId INT NULL; END
IF COL_LENGTH('venda_pagamentos', 'empresaId') IS NULL BEGIN ALTER TABLE venda_pagamentos ADD empresaId INT NULL; END
IF COL_LENGTH('centros_custo', 'empresaId') IS NULL BEGIN ALTER TABLE centros_custo ADD empresaId INT NULL; END
IF COL_LENGTH('contas_pagar', 'empresaId') IS NULL BEGIN ALTER TABLE contas_pagar ADD empresaId INT NULL; END
IF COL_LENGTH('pos_vendas', 'empresaId') IS NULL BEGIN ALTER TABLE pos_vendas ADD empresaId INT NULL; END
IF COL_LENGTH('modelos_pos_venda', 'empresaId') IS NULL BEGIN ALTER TABLE modelos_pos_venda ADD empresaId INT NULL; END
IF COL_LENGTH('configuracao_whatsapp', 'empresaId') IS NULL BEGIN ALTER TABLE configuracao_whatsapp ADD empresaId INT NULL; END
IF COL_LENGTH('auditoria_eventos', 'empresaId') IS NULL BEGIN ALTER TABLE auditoria_eventos ADD empresaId INT NULL; END
GO

DECLARE @empresaAtualId INT;
SELECT TOP 1 @empresaAtualId = id FROM empresas WHERE ativo = 1 ORDER BY id;
IF @empresaAtualId IS NULL SELECT TOP 1 @empresaAtualId = id FROM empresas ORDER BY id;

UPDATE usuarios SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE clientes SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE operadoras SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE propostas SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE motivos_perda_proposta SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE vendas SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE contas_receber SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE venda_pagamentos SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE centros_custo SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE contas_pagar SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE pos_vendas SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE modelos_pos_venda SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE configuracao_whatsapp SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
UPDATE auditoria_eventos SET empresaId = @empresaAtualId WHERE empresaId IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_usuarios_empresaId' AND object_id = OBJECT_ID('usuarios')) CREATE INDEX IX_usuarios_empresaId ON usuarios(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_clientes_empresaId' AND object_id = OBJECT_ID('clientes')) CREATE INDEX IX_clientes_empresaId ON clientes(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_operadoras_empresaId' AND object_id = OBJECT_ID('operadoras')) CREATE INDEX IX_operadoras_empresaId ON operadoras(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_propostas_empresaId' AND object_id = OBJECT_ID('propostas')) CREATE INDEX IX_propostas_empresaId ON propostas(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_motivos_perda_proposta_empresaId' AND object_id = OBJECT_ID('motivos_perda_proposta')) CREATE INDEX IX_motivos_perda_proposta_empresaId ON motivos_perda_proposta(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_vendas_empresaId' AND object_id = OBJECT_ID('vendas')) CREATE INDEX IX_vendas_empresaId ON vendas(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contas_receber_empresaId' AND object_id = OBJECT_ID('contas_receber')) CREATE INDEX IX_contas_receber_empresaId ON contas_receber(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_venda_pagamentos_empresaId' AND object_id = OBJECT_ID('venda_pagamentos')) CREATE INDEX IX_venda_pagamentos_empresaId ON venda_pagamentos(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_centros_custo_empresaId' AND object_id = OBJECT_ID('centros_custo')) CREATE INDEX IX_centros_custo_empresaId ON centros_custo(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contas_pagar_empresaId' AND object_id = OBJECT_ID('contas_pagar')) CREATE INDEX IX_contas_pagar_empresaId ON contas_pagar(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_pos_vendas_empresaId' AND object_id = OBJECT_ID('pos_vendas')) CREATE INDEX IX_pos_vendas_empresaId ON pos_vendas(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_modelos_pos_venda_empresaId' AND object_id = OBJECT_ID('modelos_pos_venda')) CREATE INDEX IX_modelos_pos_venda_empresaId ON modelos_pos_venda(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_configuracao_whatsapp_empresaId' AND object_id = OBJECT_ID('configuracao_whatsapp')) CREATE INDEX IX_configuracao_whatsapp_empresaId ON configuracao_whatsapp(empresaId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_auditoria_eventos_empresaId' AND object_id = OBJECT_ID('auditoria_eventos')) CREATE INDEX IX_auditoria_eventos_empresaId ON auditoria_eventos(empresaId);
GO

-- =============================================
-- Hardening de unicidade por tenant (empresaId)
-- =============================================

DECLARE @dropUnique NVARCHAR(MAX) = N'';

SELECT @dropUnique = @dropUnique + N'ALTER TABLE usuarios DROP CONSTRAINT ' + QUOTENAME(k.name) + N';'
FROM sys.key_constraints k
JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE k.parent_object_id = OBJECT_ID('usuarios')
    AND k.type = 'UQ'
    AND c.name = 'email';

SELECT @dropUnique = @dropUnique + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON usuarios;'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('usuarios')
    AND i.is_unique = 1
    AND i.is_primary_key = 0
    AND i.is_unique_constraint = 0
    AND c.name = 'email'
    AND i.name <> 'UX_usuarios_empresa_email';

SELECT @dropUnique = @dropUnique + N'ALTER TABLE clientes DROP CONSTRAINT ' + QUOTENAME(k.name) + N';'
FROM sys.key_constraints k
JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE k.parent_object_id = OBJECT_ID('clientes')
    AND k.type = 'UQ'
    AND c.name = 'cpf';

SELECT @dropUnique = @dropUnique + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON clientes;'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('clientes')
    AND i.is_unique = 1
    AND i.is_primary_key = 0
    AND i.is_unique_constraint = 0
    AND c.name = 'cpf'
    AND i.name <> 'UX_clientes_empresa_cpf';

SELECT @dropUnique = @dropUnique + N'ALTER TABLE operadoras DROP CONSTRAINT ' + QUOTENAME(k.name) + N';'
FROM sys.key_constraints k
JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE k.parent_object_id = OBJECT_ID('operadoras')
    AND k.type = 'UQ'
    AND c.name = 'cnpj';

SELECT @dropUnique = @dropUnique + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON operadoras;'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('operadoras')
    AND i.is_unique = 1
    AND i.is_primary_key = 0
    AND i.is_unique_constraint = 0
    AND c.name = 'cnpj'
    AND i.name <> 'UX_operadoras_empresa_cnpj';

SELECT @dropUnique = @dropUnique + N'ALTER TABLE centros_custo DROP CONSTRAINT ' + QUOTENAME(k.name) + N';'
FROM sys.key_constraints k
JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE k.parent_object_id = OBJECT_ID('centros_custo')
    AND k.type = 'UQ'
    AND c.name = 'descricao';

SELECT @dropUnique = @dropUnique + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON centros_custo;'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('centros_custo')
    AND i.is_unique = 1
    AND i.is_primary_key = 0
    AND i.is_unique_constraint = 0
    AND c.name = 'descricao'
    AND i.name <> 'UX_centros_custo_empresa_descricao';

SELECT @dropUnique = @dropUnique + N'ALTER TABLE motivos_perda_proposta DROP CONSTRAINT ' + QUOTENAME(k.name) + N';'
FROM sys.key_constraints k
JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE k.parent_object_id = OBJECT_ID('motivos_perda_proposta')
    AND k.type = 'UQ'
    AND c.name = 'descricao';

SELECT @dropUnique = @dropUnique + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON motivos_perda_proposta;'
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID('motivos_perda_proposta')
    AND i.is_unique = 1
    AND i.is_primary_key = 0
    AND i.is_unique_constraint = 0
    AND c.name = 'descricao'
    AND i.name <> 'UX_motivos_perda_empresa_descricao';

IF LEN(@dropUnique) > 0
BEGIN
        EXEC sp_executesql @dropUnique;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_usuarios_empresa_email' AND object_id = OBJECT_ID('usuarios'))
        CREATE UNIQUE INDEX UX_usuarios_empresa_email ON usuarios(empresaId, email);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_clientes_empresa_cpf' AND object_id = OBJECT_ID('clientes'))
        CREATE UNIQUE INDEX UX_clientes_empresa_cpf ON clientes(empresaId, cpf);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_operadoras_empresa_cnpj' AND object_id = OBJECT_ID('operadoras'))
        CREATE UNIQUE INDEX UX_operadoras_empresa_cnpj ON operadoras(empresaId, cnpj) WHERE cnpj IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_centros_custo_empresa_descricao' AND object_id = OBJECT_ID('centros_custo'))
        CREATE UNIQUE INDEX UX_centros_custo_empresa_descricao ON centros_custo(empresaId, descricao);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_motivos_perda_empresa_descricao' AND object_id = OBJECT_ID('motivos_perda_proposta'))
        CREATE UNIQUE INDEX UX_motivos_perda_empresa_descricao ON motivos_perda_proposta(empresaId, descricao);
GO

PRINT '✅ Script executado com sucesso!';
GO
