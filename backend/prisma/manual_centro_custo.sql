IF OBJECT_ID(N'centros_custo', N'U') IS NULL
BEGIN
    CREATE TABLE centros_custo (
        id INT IDENTITY(1,1) PRIMARY KEY,
        descricao NVARCHAR(150) NOT NULL UNIQUE,
        ativo BIT NOT NULL CONSTRAINT DF_centros_custo_ativo DEFAULT 1,
        dataCriacao DATETIME2 NOT NULL CONSTRAINT DF_centros_custo_dataCriacao DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT 1 FROM centros_custo)
BEGIN
    INSERT INTO centros_custo (descricao, ativo)
    VALUES (N'GERAL', 1);
END;

IF COL_LENGTH('contas_pagar', 'centroCustoId') IS NULL
BEGIN
    ALTER TABLE contas_pagar ADD centroCustoId INT NULL;
END;

DECLARE @centroPadraoId INT;
SELECT TOP 1 @centroPadraoId = id FROM centros_custo ORDER BY id;

IF @centroPadraoId IS NOT NULL
BEGIN
    EXEC sp_executesql N'UPDATE contas_pagar SET centroCustoId = @id WHERE centroCustoId IS NULL;', N'@id INT', @id = @centroPadraoId;
END;

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('contas_pagar')
      AND name = 'centroCustoId'
      AND is_nullable = 1
)
BEGIN
    EXEC sp_executesql N'ALTER TABLE contas_pagar ALTER COLUMN centroCustoId INT NOT NULL;';
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_contas_pagar_centros_custo'
)
BEGIN
    ALTER TABLE contas_pagar
    ADD CONSTRAINT FK_contas_pagar_centros_custo
    FOREIGN KEY (centroCustoId) REFERENCES centros_custo(id);
END;
