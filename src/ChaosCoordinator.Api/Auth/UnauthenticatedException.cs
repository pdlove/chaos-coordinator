namespace ChaosCoordinator.Api.Auth;

/// <summary>Thrown by HouseholdContext when a controller needs a resolved household but the
/// request has no authenticated session. Caught by the middleware in Program.cs and turned into
/// a 401 instead of a 500.</summary>
public class UnauthenticatedException : Exception;
