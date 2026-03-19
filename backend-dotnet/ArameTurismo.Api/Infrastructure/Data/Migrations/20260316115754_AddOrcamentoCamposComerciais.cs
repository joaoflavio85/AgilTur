using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArameTurismo.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrcamentoCamposComerciais : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AeroportoIda",
                table: "Orcamento",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AeroportoVolta",
                table: "Orcamento",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanhiaAerea",
                table: "Orcamento",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HorarioVooIda",
                table: "Orcamento",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HorarioVooVolta",
                table: "Orcamento",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkPropostaFornecedor",
                table: "Orcamento",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QtdParcelasCartao",
                table: "Orcamento",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TemAereo",
                table: "Orcamento",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorParcelaCartao",
                table: "Orcamento",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorPix",
                table: "Orcamento",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AeroportoIda",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "AeroportoVolta",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "CompanhiaAerea",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "HorarioVooIda",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "HorarioVooVolta",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "LinkPropostaFornecedor",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "QtdParcelasCartao",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "TemAereo",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "ValorParcelaCartao",
                table: "Orcamento");

            migrationBuilder.DropColumn(
                name: "ValorPix",
                table: "Orcamento");
        }
    }
}
