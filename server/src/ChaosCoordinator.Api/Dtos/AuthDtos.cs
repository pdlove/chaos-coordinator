namespace ChaosCoordinator.Api.Dtos;

public record SelectProfileRequest(Guid UserId);

public record VerifyPinRequest(Guid UserId, string Pin);

public record SessionDto(Guid? CurrentUserId, bool PinElevated);
