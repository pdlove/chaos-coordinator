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

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "ChaosCoordinator.Api.dll"]
