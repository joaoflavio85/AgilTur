IF OBJECT_ID('dbo.CreditoMovimentacao', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.CreditoMovimentacao;
END
GO

IF OBJECT_ID('dbo.CreditosCliente', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.CreditosCliente;
END
GO

CREATE TABLE dbo.CreditosCliente
(
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ClienteId INT NOT NULL,
    ClienteNome NVARCHAR(180) NOT NULL,
    ClienteTelefone NVARCHAR(25) NULL,
    ValorTotal DECIMAL(18,2) NOT NULL,
    ValorUtilizado DECIMAL(18,2) NOT NULL CONSTRAINT DF_CreditosCliente_ValorUtilizado DEFAULT (0),
    DataGeracao DATETIME2 NOT NULL,
    DataValidade DATETIME2 NOT NULL,
    Status NVARCHAR(30) NOT NULL,
    Motivo NVARCHAR(120) NOT NULL,
    Observacoes NVARCHAR(1000) NULL,
    DataCriacao DATETIME2 NOT NULL CONSTRAINT DF_CreditosCliente_DataCriacao DEFAULT (SYSUTCDATETIME()),
    DataAtualizacao DATETIME2 NOT NULL CONSTRAINT DF_CreditosCliente_DataAtualizacao DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.CreditoMovimentacao
(
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CreditoId UNIQUEIDENTIFIER NOT NULL,
    DataMovimentacao DATETIME2 NOT NULL,
    Tipo NVARCHAR(30) NOT NULL,
    Valor DECIMAL(18,2) NOT NULL,
    Observacao NVARCHAR(1000) NULL,
    VendaId NVARCHAR(50) NULL,
    CONSTRAINT FK_CreditoMovimentacao_CreditosCliente FOREIGN KEY (CreditoId)
        REFERENCES dbo.CreditosCliente(Id)
        ON DELETE CASCADE
);
GO

CREATE INDEX IX_CreditosCliente_ClienteId ON dbo.CreditosCliente(ClienteId);
CREATE INDEX IX_CreditosCliente_Status ON dbo.CreditosCliente(Status);
CREATE INDEX IX_CreditosCliente_DataValidade ON dbo.CreditosCliente(DataValidade);
CREATE INDEX IX_CreditoMovimentacao_CreditoId ON dbo.CreditoMovimentacao(CreditoId);
CREATE INDEX IX_CreditoMovimentacao_DataMovimentacao ON dbo.CreditoMovimentacao(DataMovimentacao);
GO
