using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChaosCoordinator.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameRoleParentToAdultAdultToOther : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Role is stored as its C# enum member name (HasConversion<string>()), so renaming
            // Role.Parent -> Role.Adult and the old Role.Adult -> Role.Other requires rewriting
            // existing rows. Order matters: move the old "Adult" rows out of the way first so
            // they aren't caught by the "Parent" -> "Adult" update that follows.
            migrationBuilder.Sql("UPDATE \"Users\" SET \"Role\" = 'Other' WHERE \"Role\" = 'Adult';");
            migrationBuilder.Sql("UPDATE \"Users\" SET \"Role\" = 'Adult' WHERE \"Role\" = 'Parent';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"Users\" SET \"Role\" = 'Parent' WHERE \"Role\" = 'Adult';");
            migrationBuilder.Sql("UPDATE \"Users\" SET \"Role\" = 'Adult' WHERE \"Role\" = 'Other';");
        }
    }
}
