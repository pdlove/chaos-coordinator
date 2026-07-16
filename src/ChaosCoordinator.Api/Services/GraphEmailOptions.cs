namespace ChaosCoordinator.Api.Services;

/// <summary>Populated in Program.cs from the environment variables AZURE_TENANT_ID /
/// AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / EMAIL_FROM — reusing the same App Registration
/// variable names already present on the deployment, rather than introducing new ones.
/// SenderAddress (EMAIL_FROM) must be a mailbox the App Registration has Mail.Send application
/// permission for.</summary>
public class GraphEmailOptions
{
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
