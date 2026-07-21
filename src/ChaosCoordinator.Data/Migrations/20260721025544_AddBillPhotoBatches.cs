using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBillPhotoBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BillPhotoBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    BillId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillPhotoBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BillPhotoBatches_Bills_BillId",
                        column: x => x.BillId,
                        principalTable: "Bills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BillPhotoBatches_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BillPhotoImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillPhotoImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BillPhotoImages_BillPhotoBatches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "BillPhotoBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillPhotoBatches_BillId",
                table: "BillPhotoBatches",
                column: "BillId");

            migrationBuilder.CreateIndex(
                name: "IX_BillPhotoBatches_CreatedByUserId",
                table: "BillPhotoBatches",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BillPhotoBatches_HouseholdId_CreatedAt",
                table: "BillPhotoBatches",
                columns: new[] { "HouseholdId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BillPhotoImages_BatchId_Order",
                table: "BillPhotoImages",
                columns: new[] { "BatchId", "Order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillPhotoImages");

            migrationBuilder.DropTable(
                name: "BillPhotoBatches");
        }
    }
}
