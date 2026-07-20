using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddShoppingCheckedTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedItemsHiddenBefore",
                table: "Stores",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedAt",
                table: "ShoppingListItems",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckedItemsHiddenBefore",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "CheckedAt",
                table: "ShoppingListItems");
        }
    }
}
