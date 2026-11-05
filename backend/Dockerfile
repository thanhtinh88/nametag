# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files for caching restore layer
COPY Directory.Build.props* ./
COPY src/Nametag.Domain/Nametag.Domain.csproj src/Nametag.Domain/
COPY src/Nametag.Application/Nametag.Application.csproj src/Nametag.Application/
COPY src/Nametag.Infrastructure/Nametag.Infrastructure.csproj src/Nametag.Infrastructure/
COPY src/Nametag.Api/Nametag.Api.csproj src/Nametag.Api/

RUN dotnet restore src/Nametag.Api/Nametag.Api.csproj

# Copy the rest of the source code
COPY src/ src/

WORKDIR /src/src/Nametag.Api
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Install libvips for photo processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Nametag.Api.dll"]

