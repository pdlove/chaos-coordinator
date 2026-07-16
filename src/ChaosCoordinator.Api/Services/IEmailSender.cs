namespace ChaosCoordinator.Api.Services;

/// <summary>Outbound transactional email — verification, invites, welcome. The real
/// implementation (Microsoft Graph sendMail, using the existing App Registration) needs a
/// tenant ID / client ID / client secret / sender address from the user before it can be wired
/// up; see plan_001.md Workstream 2. Until then, LoggingEmailSender is registered instead so
/// registration/invite flows work end-to-end (tokens are still created for real), they just
/// don't deliver anything.</summary>
public interface IEmailSender
{
    Task SendEmailVerificationAsync(string toEmail, string toName, string verifyUrl);
    Task SendInviteAsync(string toEmail, string toName, string familyName, string inviteUrl);
    Task SendWelcomeAsync(string toEmail, string toName, string familyName);
}
