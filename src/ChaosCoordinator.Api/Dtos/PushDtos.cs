namespace ChaosCoordinator.Api.Dtos;

public record VapidPublicKeyDto(string? PublicKey);
public record SubscribeToPushRequest(string Endpoint, string P256dh, string Auth);
public record UnsubscribeFromPushRequest(string Endpoint);
