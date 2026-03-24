using ArameTurismo.Api.Application.DTOs;
using ArameTurismo.Api.Application.Interfaces;
using ArameTurismo.Api.Domain.Entities;
using ArameTurismo.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArameTurismo.Api.Infrastructure.Services;

public class CreditoService(AppDbContext dbContext) : ICreditoService
{
    private readonly AppDbContext _dbContext = dbContext;

    private static decimal Saldo(CreditoCliente c) => Math.Max(0, c.ValorTotal - c.ValorUtilizado);

    private static int DiasParaVencer(DateTime dataValidade)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var validade = DateOnly.FromDateTime(dataValidade.Date);
        return validade.DayNumber - hoje.DayNumber;
    }

    private static string Indicador(CreditoCliente c)
    {
        var dias = DiasParaVencer(c.DataValidade);
        if (c.Status == CreditoStatus.Expirado || dias < 0) return "VERMELHO";
        if (dias <= 7) return "AMARELO";
        return "VERDE";
    }

    private static string CalcularStatus(CreditoCliente c)
    {
        var saldo = Saldo(c);
        if (saldo <= 0) return CreditoStatus.Utilizado;
        if (c.DataValidade.Date < DateTime.UtcNow.Date) return CreditoStatus.Expirado;
        if (c.ValorUtilizado > 0) return CreditoStatus.Parcial;
        return CreditoStatus.Ativo;
    }

    private static CreditoMovimentacaoDto MapMov(CreditoMovimentacao m) => new()
    {
        Id = m.Id,
        DataMovimentacao = m.DataMovimentacao,
        Tipo = m.Tipo,
        Valor = m.Valor,
        Observacao = m.Observacao,
        VendaId = m.VendaId,
    };

    private static CreditoClienteDto Map(CreditoCliente c) => new()
    {
        Id = c.Id,
        ClienteId = c.ClienteId,
        ClienteNome = c.ClienteNome,
        ClienteTelefone = c.ClienteTelefone,
        ValorTotal = c.ValorTotal,
        ValorUtilizado = c.ValorUtilizado,
        SaldoDisponivel = Saldo(c),
        DataGeracao = c.DataGeracao,
        DataValidade = c.DataValidade,
        Status = c.Status,
        Motivo = c.Motivo,
        Observacoes = c.Observacoes,
        DiasParaVencer = DiasParaVencer(c.DataValidade),
        Indicador = Indicador(c),
    };

    public async Task<CreditoClienteDto> CriarAsync(CriarCreditoDto dto, CancellationToken ct)
    {
        if (dto.ClienteId <= 0) throw new InvalidOperationException("ClienteId invalido.");
        if (string.IsNullOrWhiteSpace(dto.ClienteNome)) throw new InvalidOperationException("ClienteNome obrigatorio.");
        if (dto.ValorTotal <= 0) throw new InvalidOperationException("ValorTotal deve ser maior que zero.");
        if (dto.DataValidade.Date < dto.DataGeracao.Date) throw new InvalidOperationException("DataValidade deve ser maior ou igual a DataGeracao.");

        var credito = new CreditoCliente
        {
            Id = Guid.NewGuid(),
            ClienteId = dto.ClienteId,
            ClienteNome = dto.ClienteNome.Trim(),
            ClienteTelefone = string.IsNullOrWhiteSpace(dto.ClienteTelefone) ? null : dto.ClienteTelefone.Trim(),
            ValorTotal = dto.ValorTotal,
            ValorUtilizado = 0,
            DataGeracao = dto.DataGeracao,
            DataValidade = dto.DataValidade,
            Motivo = dto.Motivo,
            Observacoes = dto.Observacoes,
        };

        credito.Status = CalcularStatus(credito);

        _dbContext.CreditosCliente.Add(credito);
        _dbContext.CreditoMovimentacoes.Add(new CreditoMovimentacao
        {
            Id = Guid.NewGuid(),
            CreditoId = credito.Id,
            DataMovimentacao = dto.DataGeracao,
            Tipo = CreditoTipoMovimentacao.Criacao,
            Valor = dto.ValorTotal,
            Observacao = dto.Observacoes,
        });

        await _dbContext.SaveChangesAsync(ct);
        return Map(credito);
    }

    public async Task<IReadOnlyList<CreditoClienteDto>> ListarAsync(int? clienteId, string? status, DateTime? validadeInicio, DateTime? validadeFim, CancellationToken ct)
    {
        var query = _dbContext.CreditosCliente.AsNoTracking().AsQueryable();

        if (clienteId.HasValue) query = query.Where(x => x.ClienteId == clienteId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
        if (validadeInicio.HasValue) query = query.Where(x => x.DataValidade >= validadeInicio.Value.Date);
        if (validadeFim.HasValue) query = query.Where(x => x.DataValidade <= validadeFim.Value.Date.AddDays(1).AddTicks(-1));

        var lista = await query
            .OrderBy(x => x.DataValidade)
            .ThenByDescending(x => x.DataCriacao)
            .ToListAsync(ct);

        return lista.Select(Map).ToList();
    }

    public async Task<CreditoDetalheDto?> ObterPorIdAsync(Guid id, CancellationToken ct)
    {
        var credito = await _dbContext.CreditosCliente
            .AsNoTracking()
            .Include(x => x.Movimentacoes)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (credito is null) return null;

        return new CreditoDetalheDto
        {
            Id = credito.Id,
            ClienteId = credito.ClienteId,
            ClienteNome = credito.ClienteNome,
            ClienteTelefone = credito.ClienteTelefone,
            ValorTotal = credito.ValorTotal,
            ValorUtilizado = credito.ValorUtilizado,
            SaldoDisponivel = Saldo(credito),
            DataGeracao = credito.DataGeracao,
            DataValidade = credito.DataValidade,
            Status = credito.Status,
            Motivo = credito.Motivo,
            Observacoes = credito.Observacoes,
            DiasParaVencer = DiasParaVencer(credito.DataValidade),
            Indicador = Indicador(credito),
            Historico = credito.Movimentacoes
                .OrderByDescending(m => m.DataMovimentacao)
                .Select(MapMov)
                .ToList(),
        };
    }

    public async Task<CreditoClienteDto?> AtualizarAsync(Guid id, AtualizarCreditoDto dto, CancellationToken ct)
    {
        var credito = await _dbContext.CreditosCliente.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (credito is null) return null;

        if (dto.DataValidade.HasValue) credito.DataValidade = dto.DataValidade.Value;
        if (!string.IsNullOrWhiteSpace(dto.Motivo)) credito.Motivo = dto.Motivo.Trim();
        if (dto.Observacoes is not null) credito.Observacoes = dto.Observacoes;
        if (dto.ClienteTelefone is not null) credito.ClienteTelefone = string.IsNullOrWhiteSpace(dto.ClienteTelefone) ? null : dto.ClienteTelefone.Trim();

        credito.Status = CalcularStatus(credito);
        credito.DataAtualizacao = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(ct);
        return Map(credito);
    }

    public async Task<CreditoClienteDto> UtilizarAsync(Guid id, UtilizarCreditoDto dto, CancellationToken ct)
    {
        if (dto.ValorUtilizado <= 0) throw new InvalidOperationException("ValorUtilizado deve ser maior que zero.");

        var credito = await _dbContext.CreditosCliente.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Credito nao encontrado.");

        credito.Status = CalcularStatus(credito);

        if (credito.Status == CreditoStatus.Expirado)
            throw new InvalidOperationException("Credito expirado nao pode ser utilizado.");

        var saldo = Saldo(credito);
        if (dto.ValorUtilizado > saldo)
            throw new InvalidOperationException("Nao e permitido utilizar valor maior que o saldo disponivel.");

        credito.ValorUtilizado += dto.ValorUtilizado;
        credito.Status = CalcularStatus(credito);
        credito.DataAtualizacao = DateTime.UtcNow;

        _dbContext.CreditoMovimentacoes.Add(new CreditoMovimentacao
        {
            Id = Guid.NewGuid(),
            CreditoId = credito.Id,
            DataMovimentacao = dto.DataUtilizacao,
            Tipo = CreditoTipoMovimentacao.Uso,
            Valor = dto.ValorUtilizado,
            Observacao = dto.Observacao,
            VendaId = dto.VendaId,
        });

        await _dbContext.SaveChangesAsync(ct);
        return Map(credito);
    }

    public async Task<int> ExpirarCreditosAutomaticamenteAsync(CancellationToken ct)
    {
        var hoje = DateTime.UtcNow.Date;
        var creditos = await _dbContext.CreditosCliente
            .Where(x => x.Status != CreditoStatus.Utilizado && x.Status != CreditoStatus.Expirado)
            .Where(x => x.DataValidade < hoje)
            .ToListAsync(ct);

        foreach (var credito in creditos)
        {
            credito.Status = CreditoStatus.Expirado;
            credito.DataAtualizacao = DateTime.UtcNow;

            _dbContext.CreditoMovimentacoes.Add(new CreditoMovimentacao
            {
                Id = Guid.NewGuid(),
                CreditoId = credito.Id,
                DataMovimentacao = DateTime.UtcNow,
                Tipo = CreditoTipoMovimentacao.Expiracao,
                Valor = Saldo(credito),
                Observacao = "Expiracao automatica por vencimento.",
            });
        }

        if (creditos.Count > 0)
            await _dbContext.SaveChangesAsync(ct);

        return creditos.Count;
    }

    public async Task<CreditoAlertasDto> ObterAlertasAsync(CancellationToken ct)
    {
        var ativos = await _dbContext.CreditosCliente
            .AsNoTracking()
            .Where(x => x.Status != CreditoStatus.Utilizado && x.Status != CreditoStatus.Expirado)
            .ToListAsync(ct);

        var alertasBase = ativos
            .Select(x => new CreditoAlertaItemDto
            {
                Id = x.Id,
                ClienteId = x.ClienteId,
                ClienteNome = x.ClienteNome,
                ClienteTelefone = x.ClienteTelefone,
                SaldoDisponivel = Saldo(x),
                DataValidade = x.DataValidade,
                DiasParaVencer = DiasParaVencer(x.DataValidade),
            })
            .Where(x => x.SaldoDisponivel > 0)
            .ToList();

        return new CreditoAlertasDto
        {
            VencendoEm7Dias = alertasBase.Where(x => x.DiasParaVencer >= 0 && x.DiasParaVencer <= 7).OrderBy(x => x.DiasParaVencer).ToList(),
            VencendoEm3Dias = alertasBase.Where(x => x.DiasParaVencer >= 0 && x.DiasParaVencer <= 3).OrderBy(x => x.DiasParaVencer).ToList(),
            VencendoEm1Dia = alertasBase.Where(x => x.DiasParaVencer >= 0 && x.DiasParaVencer <= 1).OrderBy(x => x.DiasParaVencer).ToList(),
            TotalAtivos = ativos.Count,
            TotalExpirados = await _dbContext.CreditosCliente.CountAsync(x => x.Status == CreditoStatus.Expirado, ct),
            ValorTotalAtivo = ativos.Sum(x => Saldo(x)),
        };
    }

    public async Task<CreditoDashboardDto> ObterDashboardAsync(CancellationToken ct)
    {
        var ativos = await _dbContext.CreditosCliente
            .AsNoTracking()
            .Where(x => x.Status != CreditoStatus.Utilizado && x.Status != CreditoStatus.Expirado)
            .ToListAsync(ct);

        var aVencer7 = ativos.Count(x =>
        {
            var dias = DiasParaVencer(x.DataValidade);
            return dias >= 0 && dias <= 7 && Saldo(x) > 0;
        });

        return new CreditoDashboardDto
        {
            TotalAtivos = ativos.Count,
            TotalExpirados = await _dbContext.CreditosCliente.CountAsync(x => x.Status == CreditoStatus.Expirado, ct),
            TotalAVencer7Dias = aVencer7,
            ValorAtivo = ativos.Sum(x => Saldo(x)),
        };
    }
}
