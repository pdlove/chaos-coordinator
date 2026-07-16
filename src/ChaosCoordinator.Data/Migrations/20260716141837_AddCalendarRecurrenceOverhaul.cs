using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarRecurrenceOverhaul : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Every EventException row created before this migration was a cancellation (that was
            // its only meaning), so the backfill default is true, not the CLR default of false.
            migrationBuilder.AddColumn<bool>(
                name: "Cancelled",
                table: "EventExceptions",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "EventExceptions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "End",
                table: "EventExceptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "EventExceptions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "EventExceptions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Start",
                table: "EventExceptions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "EventExceptions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecurrenceFrequency",
                table: "CalendarEvents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            // Existing rows all repeat every 1 week/day/month, never "every 0" — the CLR default
            // of 0 would make every pre-existing recurring event stop producing any occurrences.
            migrationBuilder.AddColumn<int>(
                name: "RecurrenceInterval",
                table: "CalendarEvents",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceMonthDay",
                table: "CalendarEvents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceWeekOrdinal",
                table: "CalendarEvents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceWeekday",
                table: "CalendarEvents",
                type: "integer",
                nullable: true);

            // Pre-existing recurring events only ever meant "weekly on these days" — give them an
            // explicit RecurrenceFrequency so RecurrenceExpander (which now switches on frequency)
            // keeps expanding them the same way.
            migrationBuilder.Sql(
                """UPDATE "CalendarEvents" SET "RecurrenceFrequency" = 'Weekly' WHERE "RecurrenceDays" IS NOT NULL""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cancelled",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "End",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "Start",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "EventExceptions");

            migrationBuilder.DropColumn(
                name: "RecurrenceFrequency",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "RecurrenceInterval",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "RecurrenceMonthDay",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "RecurrenceWeekOrdinal",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "RecurrenceWeekday",
                table: "CalendarEvents");
        }
    }
}
