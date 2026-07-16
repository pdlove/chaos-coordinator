using Azure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.Graph;
using Microsoft.Graph.Models;
using Microsoft.Graph.Users.Item.SendMail;

namespace ChaosCoordinator.Api.Services;

/// <summary>Sends real mail via Microsoft Graph (application permissions, /users/{sender}/sendMail)
/// using the Azure App Registration's client-credentials flow. Registered instead of
/// LoggingEmailSender once GraphEmailOptions.IsConfigured — see Program.cs.</summary>
public class GraphEmailSender : IEmailSender
{
    private readonly GraphServiceClient _graph;
    private readonly string _senderAddress;
    private readonly string _senderName;
    private readonly ILogger<GraphEmailSender> _logger;

    public GraphEmailSender(IOptions<GraphEmailOptions> options, ILogger<GraphEmailSender> logger)
    {
        var config = options.Value;
        // EMAIL_FROM may be a bare address or a "Display Name <address>" pair — Graph's
        // /users/{id}/sendMail only accepts the bare address as the path segment, so the display
        // name (if any) has to be split off rather than passed through as-is.
        _senderAddress = ParseEmailAddress(config.SenderAddress!);
        _senderName = ParseEmailName(config.SenderAddress!);
        _logger = logger;

        var credential = new ClientSecretCredential(config.TenantId, config.ClientId, config.ClientSecret);
        _graph = new GraphServiceClient(credential, ["https://graph.microsoft.com/.default"]);
    }

    private static string ParseEmailAddress(string from)
    {
        var start = from.IndexOf('<');
        if (start >= 0)
        {
            var end = from.IndexOf('>', start);
            if (end > start) return from[(start + 1)..end].Trim();
        }
        return from.Trim();
    }

    private static string ParseEmailName(string from)
    {
        var start = from.IndexOf('<');
        if (start > 0) return from[..start].Trim();
        return from.Trim();
    }

    public Task SendEmailVerificationAsync(string toEmail, string toName, string verifyUrl) =>
        SendAsync(toEmail, toName, "Verify your Chaos Coordinator email",
            $"<p>Hi {toName},</p><p>Click below to verify your email and finish setting up your account.</p>" +
            $"<p><a href=\"{verifyUrl}\">Verify email</a></p>");

    public Task SendInviteAsync(string toEmail, string toName, string familyName, string inviteUrl) =>
        SendAsync(toEmail, toName, $"You're invited to join {familyName} on Chaos Coordinator",
            $"<p>Hi {toName},</p><p>You've been added to the {familyName} household. Click below to set a password and get started.</p>" +
            $"<p><a href=\"{inviteUrl}\">Accept invite</a></p>");

    public Task SendWelcomeAsync(string toEmail, string toName, string familyName) =>
        SendAsync(toEmail, toName, $"Welcome to {familyName} on Chaos Coordinator",
            $"<p>Hi {toName},</p><p>You're all set up on the {familyName} household. Welcome aboard!</p>");

    private async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var message = new Message
        {
            Subject = subject,
            Body = new ItemBody { ContentType = BodyType.Html, Content = htmlBody },
            ToRecipients = [new Recipient { EmailAddress = new EmailAddress { Address = toEmail, Name = toName } }],
            From = new Recipient { EmailAddress = new EmailAddress { Address = _senderAddress, Name = _senderName } },
        };

        try
        {
            await _graph.Users[_senderAddress].SendMail.PostAsync(new SendMailPostRequestBody
            {
                Message = message,
                SaveToSentItems = false,
            });
        }
        catch (Exception ex)
        {
            // Registration/invite tokens are already created by this point — a delivery failure
            // shouldn't fail the request, just leave the recipient without a link in hand.
            _logger.LogError(ex, "Graph sendMail failed for {ToEmail}", toEmail);
        }
    }
}
