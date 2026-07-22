using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceCheckedItemsHiddenBeforeWithToggle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckedItemsHiddenBefore",
                table: "Stores");

            migrationBuilder.AddColumn<bool>(
                name: "HideCheckedItemsEnabled",
                table: "Stores",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HideCheckedItemsEnabled",
                table: "Stores");

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedItemsHiddenBefore",
                table: "Stores",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
