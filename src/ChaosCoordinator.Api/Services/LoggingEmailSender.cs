namespace ChaosCoordinator.Api.Services;

/// <summary>Placeholder IEmailSender that logs instead of sending. Registered until the Graph
/// API sender (Workstream 2) is wired up with real Azure App Registration credentials — see
/// IEmailSender.</summary>
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendEmailVerificationAsync(string toEmail, string toName, string verifyUrl)
    {
        logger.LogInformation("[email:not-sent] Verification for {ToName} <{ToEmail}>: {Url}", toName, toEmail, verifyUrl);
        return Task.CompletedTask;
    }

    public Task SendInviteAsync(string toEmail, string toName, string familyName, string inviteUrl)
    {
        logger.LogInformation("[email:not-sent] Invite for {ToName} <{ToEmail}> to join {FamilyName}: {Url}", toName, toEmail, familyName, inviteUrl);
        return Task.CompletedTask;
    }

    public Task SendWelcomeAsync(string toEmail, string toName, string familyName)
    {
        logger.LogInformation("[email:not-sent] Welcome for {ToName} <{ToEmail}> to {FamilyName}", toName, toEmail, familyName);
        return Task.CompletedTask;
    }
}
