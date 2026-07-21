using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBillAccountAndConfirmationNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "BillTemplates",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "Bills",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConfirmationNumber",
                table: "Bills",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "BillTemplates");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "ConfirmationNumber",
                table: "Bills");
        }
    }
}
