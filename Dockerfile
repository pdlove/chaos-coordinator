# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ChaosCoordinator.slnx ./
COPY src/ChaosCoordinator.Domain/ChaosCoordinator.Domain.csproj src/ChaosCoordinator.Domain/
COPY src/ChaosCoordinator.Data/ChaosCoordinator.Data.csproj src/ChaosCoordinator.Data/
COPY src/ChaosCoordinator.Api/ChaosCoordinator.Api.csproj src/ChaosCoordinator.Api/
RUN dotnet restore src/ChaosCoordinator.Api/ChaosCoordinator.Api.csproj

COPY src/ ./src/
RUN dotnet publish src/ChaosCoordinator.Api/ChaosCoordinator.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Chore-completion photos live here — mount a named volume at this path so they survive
# container recreation (see docker-compose.yml).
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

# Data Protection keys (session cookie signing/encryption) — same reasoning as uploads above.
# Without a durable volume here, every container recreation invalidates all existing sessions.
RUN mkdir -p /app/keys
VOLUME ["/app/keys"]

# Not setting ASPNETCORE_URLS here — the base aspnet image already sets ASPNETCORE_HTTP_PORTS=8080,
# and setting both makes ASP.NET Core warn about the conflict and prefer URLS anyway.
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "ChaosCoordinator.Api.dll"]
