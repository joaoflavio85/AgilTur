using ArameTurismo.Api.Application.Interfaces;
using ArameTurismo.Api.Infrastructure.Data;
using ArameTurismo.Api.Infrastructure.Options;
using ArameTurismo.Api.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.Configure<TwilioOptions>(builder.Configuration.GetSection(TwilioOptions.SectionName));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IOrcamentoService, OrcamentoService>();
builder.Services.AddScoped<IOrcamentoPdfService, QuestPdfOrcamentoPdfService>();
builder.Services.AddScoped<ICreditoService, CreditoService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IWhatsAppSender, TwilioWhatsAppSender>();
builder.Services.AddHostedService<CreditoExpiracaoBackgroundService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

QuestPDF.Settings.License = LicenseType.Community;

var app = builder.Build();

await EnsureCreditosSchemaAsync(app);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthorization();
app.MapControllers();
app.Run();

static async Task EnsureCreditosSchemaAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var createCreditosCliente = @"
IF OBJECT_ID(N'dbo.CreditosCliente', N'U') IS NULL
BEGIN
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
END";

    var createCreditoMovimentacao = @"
IF OBJECT_ID(N'dbo.CreditoMovimentacao', N'U') IS NULL
BEGIN
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
END";

    var createIndexes = @"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CreditosCliente_ClienteId' AND object_id = OBJECT_ID(N'dbo.CreditosCliente'))
    CREATE INDEX IX_CreditosCliente_ClienteId ON dbo.CreditosCliente(ClienteId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CreditosCliente_Status' AND object_id = OBJECT_ID(N'dbo.CreditosCliente'))
    CREATE INDEX IX_CreditosCliente_Status ON dbo.CreditosCliente(Status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CreditosCliente_DataValidade' AND object_id = OBJECT_ID(N'dbo.CreditosCliente'))
    CREATE INDEX IX_CreditosCliente_DataValidade ON dbo.CreditosCliente(DataValidade);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CreditoMovimentacao_CreditoId' AND object_id = OBJECT_ID(N'dbo.CreditoMovimentacao'))
    CREATE INDEX IX_CreditoMovimentacao_CreditoId ON dbo.CreditoMovimentacao(CreditoId);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CreditoMovimentacao_DataMovimentacao' AND object_id = OBJECT_ID(N'dbo.CreditoMovimentacao'))
    CREATE INDEX IX_CreditoMovimentacao_DataMovimentacao ON dbo.CreditoMovimentacao(DataMovimentacao);";

    await db.Database.ExecuteSqlRawAsync(createCreditosCliente);
    await db.Database.ExecuteSqlRawAsync(createCreditoMovimentacao);
    await db.Database.ExecuteSqlRawAsync(createIndexes);
}
