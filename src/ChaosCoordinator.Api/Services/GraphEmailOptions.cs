namespace ChaosCoordinator.Api.Services;

/// <summary>Bound from configuration section "Graph" — set via appsettings, or environment
/// variables Graph__TenantId / Graph__ClientId / Graph__ClientSecret / Graph__SenderAddress (the
/// standard ASP.NET Core double-underscore convention, so it works the same whether it comes from
/// .env → docker-compose "environment:" or a local appsettings.Development.json). SenderAddress
/// must be a mailbox the App Registration has Mail.Send application permission for.</summary>
public class GraphEmailOptions
{
    public const string SectionName = "Graph";

    public string? TenantId { get; set; }
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
    public string? SenderAddress { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(TenantId)
        && !string.IsNullOrWhiteSpace(ClientId)
        && !string.IsNullOrWhiteSpace(ClientSecret)
        && !string.IsNullOrWhiteSpace(SenderAddress);
}
