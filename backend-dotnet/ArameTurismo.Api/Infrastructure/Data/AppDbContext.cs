using ArameTurismo.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ArameTurismo.Api.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Proposta> Propostas => Set<Proposta>();
    public DbSet<Orcamento> Orcamentos => Set<Orcamento>();
    public DbSet<OrcamentoImagem> OrcamentoImagens => Set<OrcamentoImagem>();
    public DbSet<HistoricoOrcamento> HistoricoOrcamentos => Set<HistoricoOrcamento>();
    public DbSet<OrcamentoVisualizacao> OrcamentoVisualizacoes => Set<OrcamentoVisualizacao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Proposta>(entity =>
        {
            entity.ToTable("Proposta");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
        });

        modelBuilder.Entity<Orcamento>(entity =>
        {
            entity.ToTable("Orcamento");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.PropostaId, x.Versao }).IsUnique();
            entity.HasIndex(x => x.PublicToken).IsUnique().HasFilter("[PublicToken] IS NOT NULL");
            entity.Property(x => x.Titulo).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Destino).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Hotel).HasMaxLength(180);
            entity.Property(x => x.CompanhiaAerea).HasMaxLength(120);
            entity.Property(x => x.HorarioVooIda).HasMaxLength(60);
            entity.Property(x => x.HorarioVooVolta).HasMaxLength(60);
            entity.Property(x => x.AeroportoIda).HasMaxLength(120);
            entity.Property(x => x.AeroportoVolta).HasMaxLength(120);
            entity.Property(x => x.Moeda).HasMaxLength(3).HasDefaultValue("BRL").IsRequired();
            entity.Property(x => x.FormaPagamento).HasMaxLength(200);
            entity.Property(x => x.LinkPropostaFornecedor).HasMaxLength(500);
            entity.Property(x => x.Status).HasMaxLength(30).HasDefaultValue(OrcamentoStatus.Rascunho).IsRequired();
            entity.Property(x => x.PublicToken).HasMaxLength(80);
            entity.Property(x => x.ValorTotal).HasColumnType("decimal(18,2)");
            entity.Property(x => x.ValorParcelaCartao).HasColumnType("decimal(18,2)");
            entity.Property(x => x.ValorPix).HasColumnType("decimal(18,2)");

            entity.HasOne(x => x.Proposta)
                .WithMany(x => x.Orcamentos)
                .HasForeignKey(x => x.PropostaId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrcamentoImagem>(entity =>
        {
            entity.ToTable("OrcamentoImagem");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Url).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Legenda).HasMaxLength(200);
            entity.Property(x => x.Tipo).HasMaxLength(20).HasDefaultValue("DESTINO").IsRequired();

            entity.HasOne(x => x.Orcamento)
                .WithMany(x => x.Imagens)
                .HasForeignKey(x => x.OrcamentoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HistoricoOrcamento>(entity =>
        {
            entity.ToTable("HistoricoOrcamento");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.MeioEnvio).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Destinatario).HasMaxLength(180);

            entity.HasOne(x => x.Orcamento)
                .WithMany(x => x.Historicos)
                .HasForeignKey(x => x.OrcamentoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrcamentoVisualizacao>(entity =>
        {
            entity.ToTable("OrcamentoVisualizacao");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IpHash).HasMaxLength(128);
            entity.Property(x => x.UserAgent).HasMaxLength(300);
            entity.Property(x => x.Origem).HasMaxLength(50);

            entity.HasOne(x => x.Orcamento)
                .WithMany(x => x.Visualizacoes)
                .HasForeignKey(x => x.OrcamentoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        base.OnModelCreating(modelBuilder);
    }
}
