using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarCategoriesAndLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. New tables first, so default categories can be seeded per household before
            // touching CalendarEvents/EventExceptions at all.
            migrationBuilder.CreateTable(
                name: "CalendarCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Color = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CalendarCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SavedLocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseholdId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedLocations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CalendarCategories_HouseholdId_Order",
                table: "CalendarCategories",
                columns: new[] { "HouseholdId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_SavedLocations_HouseholdId_Order",
                table: "SavedLocations",
                columns: new[] { "HouseholdId", "Order" });

            // 2. Seed the 6 defaults every existing household gets — the same set
            // AuthController.Register now seeds for newly-registered households.
            migrationBuilder.Sql(
                """
                INSERT INTO "CalendarCategories" ("Id", "HouseholdId", "Name", "Color", "Order")
                SELECT gen_random_uuid(), h."Id", v.name, v.color, v.ord
                FROM "Households" h
                CROSS JOIN (VALUES
                    ('Work', 0, '#4C8BF5'),
                    ('School', 1, '#9B6BD9'),
                    ('Doctor', 2, '#E8607A'),
                    ('Home', 3, '#1FB6A6'),
                    ('Personal', 4, '#F2A93B'),
                    ('Activities', 5, '#FF6B57')
                ) AS v(name, ord, color)
                """);

            // 3. CategoryId starts nullable so it can be backfilled from the old string Category
            // column below, then tightened to NOT NULL on CalendarEvents once every row has one.
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "CalendarEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "EventExceptions",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "CalendarEvents" e
                SET "CategoryId" = c."Id"
                FROM "CalendarCategories" c
                WHERE c."HouseholdId" = e."HouseholdId" AND c."Name" = e."Category"
                """);

            migrationBuilder.Sql(
                """
                UPDATE "EventExceptions" x
                SET "CategoryId" = c."Id"
                FROM "CalendarCategories" c, "CalendarEvents" e
                WHERE x."EventId" = e."Id" AND c."HouseholdId" = e."HouseholdId" AND c."Name" = x."Category"
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "CategoryId",
                table: "CalendarEvents",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "Category",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "CalendarEvents");

            migrationBuilder.CreateIndex(
                name: "IX_EventExceptions_CategoryId",
                table: "EventExceptions",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_CalendarEvents_CategoryId",
                table: "CalendarEvents",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_CalendarEvents_CalendarCategories_CategoryId",
                table: "CalendarEvents",
                column: "CategoryId",
                principalTable: "CalendarCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EventExceptions_CalendarCategories_CategoryId",
                table: "EventExceptions",
                column: "CategoryId",
                principalTable: "CalendarCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CalendarEvents_CalendarCategories_CategoryId",
                table: "CalendarEvents");

            migrationBuilder.DropForeignKey(
                name: "FK_EventExceptions_CalendarCategories_CategoryId",
                table: "EventExceptions");

            migrationBuilder.DropTable(
                name: "CalendarCategories");

            migrationBuilder.DropTable(
                name: "SavedLocations");

            migrationBuilder.DropIndex(
                name: "IX_EventExceptions_CategoryId",
                table: "EventExceptions");

            migrationBuilder.DropIndex(
                name: "IX_CalendarEvents_CategoryId",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "CalendarEvents");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "EventExceptions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "CalendarEvents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }
    }
}
