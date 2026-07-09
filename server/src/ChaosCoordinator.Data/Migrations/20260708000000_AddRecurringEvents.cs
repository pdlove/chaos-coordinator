using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RecurrenceDays",
                table: "CalendarEvents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RecurrenceEnd",
                table: "CalendarEvents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EventExceptions",
                columns: table => new
                {
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventExceptions", x => new { x.EventId, x.Date });
                    table.ForeignKey(
                        name: "FK_EventExceptions_CalendarEvents_EventId",
                        column: x => x.EventId,
                        principalTable: "CalendarEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "EventExceptions");

            migrationBuilder.DropColumn(name: "RecurrenceDays", table: "CalendarEvents");
            migrationBuilder.DropColumn(name: "RecurrenceEnd", table: "CalendarEvents");
        }
    }
}
