using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEventImportBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ImportBatchId",
                table: "CalendarEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EventImportBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PastedText = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventImportBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventImportBatches_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EventImportImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventImportImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventImportImages_EventImportBatches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "EventImportBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CalendarEvents_ImportBatchId",
                table: "CalendarEvents",
                column: "ImportBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_EventImportBatches_CreatedByUserId",
                table: "EventImportBatches",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EventImportBatches_HouseholdId_CreatedAt",
                table: "EventImportBatches",
                columns: new[] { "HouseholdId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EventImportImages_BatchId_Order",
                table: "EventImportImages",
                columns: new[] { "BatchId", "Order" });

            migrationBuilder.AddForeignKey(
                name: "FK_CalendarEvents_EventImportBatches_ImportBatchId",
                table: "CalendarEvents",
                column: "ImportBatchId",
                principalTable: "EventImportBatches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CalendarEvents_EventImportBatches_ImportBatchId",
                table: "CalendarEvents");

            migrationBuilder.DropTable(
                name: "EventImportImages");

            migrationBuilder.DropTable(
                name: "EventImportBatches");

            migrationBuilder.DropIndex(
                name: "IX_CalendarEvents_ImportBatchId",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "ImportBatchId",
                table: "CalendarEvents");
        }
    }
}
