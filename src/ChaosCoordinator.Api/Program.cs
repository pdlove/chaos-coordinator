using System.Text.Json.Serialization;
using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Hubs;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = "public",
});

// ---- Services ----
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(Environment.GetEnvironmentVariable("DATABASE_URL")
        ?? builder.Configuration.GetConnectionString("Default")));

builder.Services.AddSignalR();

// Session cookie is the only identity mechanism this app needs — a trust-based single-household
// app where "current profile" is a UI convenience and PIN elevation is the real security boundary.
// See Auth/RequirePinElevationAttribute.cs and Controllers/AuthController.cs.
builder.Services.AddDistributedMemoryCache();
builder.Services.AddMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.Name = "cc_session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.IdleTimeout = TimeSpan.FromDays(30);
});

builder.Services.AddSingleton<IPinElevationStore, PinElevationStore>();
builder.Services.AddScoped<IHouseholdNotifier, HouseholdNotifier>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserAccessor, CurrentUserAccessor>();
builder.Services.AddSingleton<HouseholdContext>();
builder.Services.AddScoped<ChaosCoordinator.Api.Services.BillGenerationService>();

// Dev-only CORS for hitting the API directly from a Vite dev server on a different port when not
// using its proxy. The supported path (dev via Vite proxy, prod via nginx) is same-origin, so this
// is a fallback, not the primary flow.
const string DevCorsPolicy = "DevCors";
const string ProdCorsPolicy = "ProdCors";
var corsOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
var appUrl = Environment.GetEnvironmentVariable("APP_URL");
builder.Services.AddCors(options =>
{
    options.AddPolicy(DevCorsPolicy, policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());

    if (corsOrigins is not null)
    {
        var origins = corsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        options.AddPolicy(ProdCorsPolicy, policy =>
            policy.WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
    }
});

var app = builder.Build();

// ---- Migrate + seed on startup ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);

    var householdContext = scope.ServiceProvider.GetRequiredService<HouseholdContext>();
    householdContext.HouseholdId = await db.Households.Select(h => h.Id).SingleAsync();
}

// ---- Pipeline ----
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors(DevCorsPolicy);
}
else if (corsOrigins is not null)
{
    app.UseCors(ProdCorsPolicy);
}

var uploadsDir = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsDir);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsDir),
    RequestPath = "/uploads",
});

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseSession();
app.UseAuthorization();

app.MapControllers();
app.MapHub<HouseholdHub>("/hubs/household");

// SPA fallbacks — wall display has its own entry point; everything else gets the main app.
app.MapFallbackToFile("/wall", "wall.html");
app.MapFallbackToFile("/wall/{**slug}", "wall.html");
app.MapFallbackToFile("index.html");

app.Run();
