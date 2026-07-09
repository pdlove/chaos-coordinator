namespace ChaosCoordinator.Api.Dtos;

public record SelectProfileRequest(Guid UserId);

public record VerifyPinRequest(Guid UserId, string Pin);

public record LoginRequest(Guid UserId, string Pin, bool Remember);

public record SessionDto(Guid? CurrentUserId, bool PinElevated);
