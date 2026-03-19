CREATE TABLE Proposta (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ClienteId UNIQUEIDENTIFIER NOT NULL,
    AgenteId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(30) NOT NULL,
    DataCriacao DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE Orcamento (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    PropostaId UNIQUEIDENTIFIER NOT NULL,
    Versao INT NOT NULL,
    Titulo NVARCHAR(180) NOT NULL,
    Destino NVARCHAR(150) NOT NULL,
    Hotel NVARCHAR(180) NULL,
    DescricaoDestino NVARCHAR(MAX) NULL,
    DescricaoHotel NVARCHAR(MAX) NULL,
    Roteiro NVARCHAR(MAX) NULL,
    Destaques NVARCHAR(MAX) NULL,
    DataInicio DATE NULL,
    DataFim DATE NULL,
    TemAereo BIT NOT NULL DEFAULT 0,
    CompanhiaAerea NVARCHAR(120) NULL,
    HorarioVooIda NVARCHAR(60) NULL,
    HorarioVooVolta NVARCHAR(60) NULL,
    AeroportoIda NVARCHAR(120) NULL,
    AeroportoVolta NVARCHAR(120) NULL,
    NumeroPessoas INT NOT NULL,
    ValorTotal DECIMAL(18,2) NOT NULL,
    QtdParcelasCartao INT NULL,
    ValorParcelaCartao DECIMAL(18,2) NULL,
    ValorPix DECIMAL(18,2) NULL,
    LinkPropostaFornecedor NVARCHAR(500) NULL,
    Moeda CHAR(3) NOT NULL DEFAULT 'BRL',
    FormaPagamento NVARCHAR(200) NULL,
    Observacoes NVARCHAR(MAX) NULL,
    Condicoes NVARCHAR(MAX) NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
    IsPublicado BIT NOT NULL DEFAULT 0,
    PublicToken NVARCHAR(80) NULL,
    DataCriacao DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DataAtualizacao DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CriadoPorAgenteId UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT FK_Orcamento_Proposta FOREIGN KEY (PropostaId) REFERENCES Proposta(Id)
);
GO

CREATE UNIQUE INDEX UX_Orcamento_Proposta_Versao ON Orcamento(PropostaId, Versao);
CREATE UNIQUE INDEX UX_Orcamento_PublicToken ON Orcamento(PublicToken) WHERE PublicToken IS NOT NULL;
GO

CREATE TABLE OrcamentoImagem (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    OrcamentoId UNIQUEIDENTIFIER NOT NULL,
    Url NVARCHAR(500) NOT NULL,
    Legenda NVARCHAR(200) NULL,
    Ordem INT NOT NULL DEFAULT 0,
    Tipo NVARCHAR(20) NOT NULL DEFAULT 'DESTINO',
    CONSTRAINT FK_OrcamentoImagem_Orcamento FOREIGN KEY (OrcamentoId) REFERENCES Orcamento(Id) ON DELETE CASCADE
);
GO

CREATE TABLE HistoricoOrcamento (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    OrcamentoId UNIQUEIDENTIFIER NOT NULL,
    DataEnvio DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    MeioEnvio NVARCHAR(20) NOT NULL,
    Status NVARCHAR(30) NOT NULL,
    Destinatario NVARCHAR(180) NULL,
    Mensagem NVARCHAR(MAX) NULL,
    CONSTRAINT FK_HistoricoOrcamento_Orcamento FOREIGN KEY (OrcamentoId) REFERENCES Orcamento(Id) ON DELETE CASCADE
);
GO

CREATE TABLE OrcamentoVisualizacao (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    OrcamentoId UNIQUEIDENTIFIER NOT NULL,
    DataVisualizacao DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IpHash NVARCHAR(128) NULL,
    UserAgent NVARCHAR(300) NULL,
    Origem NVARCHAR(50) NULL,
    CONSTRAINT FK_OrcamentoVisualizacao_Orcamento FOREIGN KEY (OrcamentoId) REFERENCES Orcamento(Id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_Orcamento_PropostaId ON Orcamento(PropostaId);
CREATE INDEX IX_HistoricoOrcamento_OrcamentoId ON HistoricoOrcamento(OrcamentoId);
CREATE INDEX IX_OrcamentoVisualizacao_OrcamentoId ON OrcamentoVisualizacao(OrcamentoId);
GO
