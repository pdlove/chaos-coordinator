using System.Text.Json.Serialization;
using ChaosCoordinator.Api.Auth;
using ChaosCoordinator.Api.Hubs;
using ChaosCoordinator.Api.Realtime;
using ChaosCoordinator.Data;
using Microsoft.AspNetCore.DataProtection;
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

// Without this, keys live in the default per-machine/per-container location and are regenerated
// on every restart — every existing session cookie (and anything else protected via
// IDataProtector) silently becomes invalid the moment the container restarts. Mount a durable
// volume at this path (see docker-compose.yml/Dockerfile) so it survives restarts and redeploys.
var dataProtectionKeysDir = Environment.GetEnvironmentVariable("DATA_PROTECTION_KEYS_PATH")
    ?? Path.Combine(builder.Environment.ContentRootPath, "keys");
Directory.CreateDirectory(dataProtectionKeysDir);
builder.Services.AddDataProtection()
    .SetApplicationName("ChaosCoordinator")
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysDir));

// Session cookie carries "who's logged in" (email+password login, or PIN login on the wall
// display); HouseholdContext resolves which household that user belongs to per-request. PIN
// elevation remains the separate, stronger boundary for sensitive actions — see
// Auth/RequirePinElevationAttribute.cs and Controllers/AuthController.cs.
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
// Scoped, not singleton — see HouseholdContext for why (multi-tenant: resolved per-request from
// the logged-in user, not decided once at startup).
builder.Services.AddScoped<HouseholdContext>();
builder.Services.AddScoped<ChaosCoordinator.Api.Services.BillGenerationService>();

// Real delivery once AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET/EMAIL_FROM are set —
// falls back to logging the link instead of sending so registration/invite flows still work
// end-to-end without those credentials configured.
var graphOptions = new ChaosCoordinator.Api.Services.GraphEmailOptions
{
    TenantId = Environment.GetEnvironmentVariable("AZURE_TENANT_ID"),
    ClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID"),
    ClientSecret = Environment.GetEnvironmentVariable("AZURE_CLIENT_SECRET"),
    SenderAddress = Environment.GetEnvironmentVariable("EMAIL_FROM"),
};
builder.Services.Configure<ChaosCoordinator.Api.Services.GraphEmailOptions>(o =>
{
    o.TenantId = graphOptions.TenantId;
    o.ClientId = graphOptions.ClientId;
    o.ClientSecret = graphOptions.ClientSecret;
    o.SenderAddress = graphOptions.SenderAddress;
});
if (graphOptions.IsConfigured)
{
    builder.Services.AddScoped<ChaosCoordinator.Api.Services.IEmailSender, ChaosCoordinator.Api.Services.GraphEmailSender>();
}
else
{
    builder.Services.AddScoped<ChaosCoordinator.Api.Services.IEmailSender, ChaosCoordinator.Api.Services.LoggingEmailSender>();
}

// Bot protection on login/registration once TURNSTILE_SECRET_KEY is set — falls back to a
// no-op verifier so those flows keep working end-to-end without Cloudflare credentials configured.
var turnstileOptions = new ChaosCoordinator.Api.Services.TurnstileOptions
{
    SecretKey = Environment.GetEnvironmentVariable("TURNSTILE_SECRET_KEY"),
};
builder.Services.Configure<ChaosCoordinator.Api.Services.TurnstileOptions>(o =>
{
    o.SecretKey = turnstileOptions.SecretKey;
});
if (turnstileOptions.IsConfigured)
{
    builder.Services.AddHttpClient<ChaosCoordinator.Api.Services.ITurnstileVerifier, ChaosCoordinator.Api.Services.CloudflareTurnstileVerifier>();
}
else
{
    builder.Services.AddScoped<ChaosCoordinator.Api.Services.ITurnstileVerifier, ChaosCoordinator.Api.Services.NoopTurnstileVerifier>();
}

// Web Push (calendar reminders, chore alarms, chore-completion alerts) once VAPID_PUBLIC_KEY/
// VAPID_PRIVATE_KEY/VAPID_SUBJECT are set — falls back to logging instead of sending so those
// flows still work end-to-end without real VAPID credentials configured.
var vapidOptions = new ChaosCoordinator.Api.Services.VapidOptions
{
    PublicKey = Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY"),
    PrivateKey = Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY"),
    Subject = Environment.GetEnvironmentVariable("VAPID_SUBJECT"),
};
builder.Services.Configure<ChaosCoordinator.Api.Services.VapidOptions>(o =>
{
    o.PublicKey = vapidOptions.PublicKey;
    o.PrivateKey = vapidOptions.PrivateKey;
    o.Subject = vapidOptions.Subject;
});
if (vapidOptions.IsConfigured)
{
    builder.Services.AddSingleton<ChaosCoordinator.Api.Services.IPushSender, ChaosCoordinator.Api.Services.WebPushSender>();
}
else
{
    builder.Services.AddSingleton<ChaosCoordinator.Api.Services.IPushSender, ChaosCoordinator.Api.Services.NoopPushSender>();
}
builder.Services.AddScoped<ChaosCoordinator.Api.Services.PushNotificationService>();
builder.Services.AddHostedService<ChaosCoordinator.Api.Services.ReminderCheckService>();

// Local Ollama vision model for the "create events from a photo" import flow. Not in Docker —
// runs on the host, reached via OLLAMA_BASE_URL (host.docker.internal:11434 when this API runs
// in the docker-compose.dev.yml container, which already has host-gateway wired for this).
// There's no no-op fallback here (unlike email/push/turnstile above) — extraction just isn't
// optional, so EventImportController surfaces a clear error if it can't be reached.
var ollamaOptions = new ChaosCoordinator.Api.Services.OllamaOptions
{
    BaseUrl = Environment.GetEnvironmentVariable("OLLAMA_BASE_URL") ?? "http://localhost:11434",
    VisionModel = Environment.GetEnvironmentVariable("OLLAMA_VISION_MODEL") ?? "llava",
    LogPrompts = string.Equals(Environment.GetEnvironmentVariable("OLLAMA_LOG_PROMPTS"), "true", StringComparison.OrdinalIgnoreCase),
};
builder.Services.Configure<ChaosCoordinator.Api.Services.OllamaOptions>(o =>
{
    o.BaseUrl = ollamaOptions.BaseUrl;
    o.VisionModel = ollamaOptions.VisionModel;
    o.LogPrompts = ollamaOptions.LogPrompts;
});
builder.Services.AddHttpClient<ChaosCoordinator.Api.Services.IEventExtractionService, ChaosCoordinator.Api.Services.OllamaEventExtractionService>(client =>
{
    client.BaseAddress = new Uri(ollamaOptions.BaseUrl);
    // Local CPU/GPU inference is slow — the frontend sets real "this can take a minute"
    // expectations around this call, so the HttpClient shouldn't time out before it can return.
    client.Timeout = TimeSpan.FromSeconds(120);
});

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

// ---- Migrate on startup ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
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

// HouseholdContext throws this when a controller needs a household but the request has no
// authenticated session — turn it into a 401 instead of a 500.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (UnauthenticatedException)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
    }
});

app.UseAuthorization();

app.MapControllers();
app.MapHub<HouseholdHub>("/hubs/household");

// SPA fallbacks — wall display has its own entry point; everything else gets the main app.
app.MapFallbackToFile("/wall", "wall.html");
app.MapFallbackToFile("/wall/{**slug}", "wall.html");
app.MapFallbackToFile("index.html");

app.Run();
