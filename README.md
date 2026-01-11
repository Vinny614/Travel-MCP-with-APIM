# Travel MCP Server with Azure APIM

A Model Context Protocol (MCP) server for comprehensive travel planning, deployed as an Azure Web App and managed through Azure API Management (APIM). This server integrates with **Skyscanner** for flights, **TripAdvisor** for attractions and restaurants, and **Met Office** for weather forecasts.

## Features

- **MCP Protocol Support**: Full compliance with the Model Context Protocol
- **Flight Search**: Search flights using Skyscanner API (information only, no booking)
- **Weather Forecasts**: Get weather predictions using Met Office API
- **Attractions & Restaurants**: Search local attractions and dining using TripAdvisor API
- **Azure Infrastructure**: Deployed on Azure Web Apps with APIM
- **Scalability**: Managed through Azure APIM with rate limiting and monitoring
- **Monitoring**: Application Insights integration for logging and telemetry

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  Azure APIM  │─────▶│  Web App    │
│   (AI/App)  │      │  (Gateway)   │      │  (MCP Server)│
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ App Insights │
                     │  (Logging)   │
                     └──────────────┘
```

## Available Tools

### Basic Destination Tools

### 1. `list_destinations`
Lists all available travel destinations with brief descriptions.

**Input**: None

**Output**: Array of destinations with id, name, and description

### 2. `get_destination_info`
Get detailed information about a specific destination.

**Input**:
```json
{
  "destination": "paris"
}
```

**Output**: Detailed destination information including attractions, best time to visit, costs, and climate

### 3. `search_destinations`
Search destinations by keyword in name, description, or attractions.

**Input**:
```json
{
  "query": "beach"
}
```

**Output**: Array of matching destinations

### 4. `get_travel_tips`
Get travel tips for a specific category.

**Input**:
```json
{
  "category": "packing"
}
```

**Categories**: packing, safety, budgeting, cultural

**Output**: Array of tips for the specified category

### Flight Search Tools

### 5. `search_flights`
Search for flights between locations (Skyscanner integration - information only, no booking).

**Input**:
```json
{
  "origin": "JFK",
  "destination": "LHR",
  "departDate": "2026-03-15",
  "returnDate": "2026-03-22",
  "adults": 2,
  "cabinClass": "economy"
}
```

**Output**: Array of flight options with pricing, airlines, duration, and stops

### Weather Tools

### 6. `get_weather_forecast`
Get weather forecast for a destination (Met Office integration).

**Input**:
```json
{
  "location": "London",
  "days": 5
}
```

**Output**: Multi-day weather forecast with temperature, conditions, precipitation, wind, and humidity

### Attraction & Restaurant Tools

### 7. `search_attractions`
Search for attractions and things to do (TripAdvisor integration).

**Input**:
```json
{
  "location": "Paris",
  "category": "museum"
}
```

**Output**: Array of attractions with ratings, reviews, descriptions, and pricing

### 8. `search_restaurants`
Search for restaurants in a location (TripAdvisor integration).

**Input**:
```json
{
  "location": "Tokyo",
  "cuisine": "Japanese"
}
```

**Output**: Array of restaurants with ratings, reviews, cuisine types, and price levels

## Prerequisites

- Node.js 20.x or later
- Azure CLI
- Azure subscription
- npm or yarn
- **API keys for external services** (required):
  - Skyscanner API (via RapidAPI)
  - Met Office DataHub API
  - TripAdvisor Content API

See [API Integration Guide](docs/API_INTEGRATION.md) for details on obtaining API keys.

## Local Development

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Run Locally (HTTP Mode)

```bash
export HTTP_MODE=true
export PORT=3000
npm start
```

### Run Locally (stdio Mode for MCP)

```bash
npm start
```

### Test with Docker

```bash
docker-compose up
```

### Test the Health Endpoint

```bash
# List all tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/list"
  }'

# Search for flights
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_flights",
      "arguments": {
        "origin": "JFK",
        "destination": "LHR",
        "departDate": "2026-03-15"
      }
    }
  }'

# Get weather forecast
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather_forecast",
      "arguments": {
        "location": "Paris",
        "days": 5
      }
    }
  }'

# Search attractions
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
     ,
    "skyscannerApiKey": {
      "value": "your-skyscanner-api-key-or-leave-empty"
    },
    "metOfficeApiKey": {
      "value": "your-met-office-api-key"
    },
    "tripAdvisorApiKey": {
      "value": "your-tripadvisor-api-key"
    }
  }
}
```

**Note**: API keys are required for the external API tools to function.

2. **Login to Azure**

```bash
az login
```

3. **Create Resource Group**

```bash
az group create --name travel-mcp-rg --location eastus
```

4. **Deploy Infrastructure**

```bash
az deployment group create \
  --name travel-mcp-deployment \
  --resource-group travel-mcp-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```

5. **Build Application**

```bash
npm install
npm run build
```

6. **Deploy Application**

```bash
# Get the Web App name from deployment outputs
WEB_APP_NAME=$(az deployment group show \
  --resource-group travel-mcp-rg \
  --name travel-mcp-deployment \
  --query properties.outputs.webAppName.value -o tsv)

# Create deployment package
zip -r deploy.zip dist/ node_modules/ package.json

# Deploy to Web App
az webapp deployment source config-zip \
  --resource-group travel-mcp-rg \
  --name $WEB_APP_NAME \
  --src deploy.zip
```

### GitHub Actions CI/CD

The project includes a GitHub Actions workflow for automated deployment.

1. **Setup Azure Credentials**

Create a service principal:

```bash
az ad sp create-for-rbac \
  --name "travel-mcp-sp" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/travel-mcp-rg \
  --sdk-auth
```

2. **Configure GitHub Secrets**

Add the following secrets to your GitHub repository:
- `AZURE_CREDENTIALS`: Output from the service principal creation
- `APIM_PUBLISHER_EMAIL`: Your email for APIM
- `APIM_PUBLISHER_NAME`: Your organization name
- `SKYSCANNER_API_KEY`: Your Skyscanner API key (required)
- `MET_OFFICE_API_KEY`: Your Met Office API key (required)
- `TRIPADVISOR_API_KEY`: Your TripAdvisor API key (required)

3. **Push to Main Branch**

The workflow will automatically deploy on push to main branch.

## Using the MCP Server

### Get APIM Subscription Key

```bash
# List subscriptions
az apim subscription list \

```bash
# Update parameters in infra/main.parameters.json first
chmod +x deploy.sh
./deploy.sh
```

#### Windows

```cmd
REM Update parameters in infra/main.parameters.json first
deploy.bat
```

### Manual Deployment Steps

1. **Update Parameters**

Edit `infra/main.parameters.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "publisherEmail": {
      "value": "your-email@example.com"
    },
    "publisherName": {
      "value": "Your Organization"
    },
    "skyscannerApiKey": {
      "value": "your-skyscanner-api-key"
    },
    "metOfficeApiKey": {
      "value": "your-met-office-api-key"
    },
    "tripAdvisorApiKey": {
      "value": "your-tripadvisor-api-key"
    }
  }
}
```

**Note**: API keys are required for the external API tools to function.

2. **Login to Azure**

```bash
az login
```

3. **Create Resource Group**

```bash
az group create --name travel-mcp-rg --location eastus
```

4. **Deploy Infrastructure**

```bash
az deployment group create \
  --name travel-mcp-deployment \
  --resource-group travel-mcp-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```

5. **Build Application**

```bash
npm install
npm run build
```

6. **Deploy Application**

```bash
# Get the Web App name from deployment outputs
WEB_APP_NAME=$(az deployment group show \
  --resource-group travel-mcp-rg \
  --name travel-mcp-deployment \
  --query properties.outputs.webAppName.value -o tsv)

# Create deployment package
zip -r deploy.zip dist/ node_modules/ package.json

# Deploy to Web App
az webapp deployment source config-zip \
  --resource-group travel-mcp-rg \
  --name $WEB_APP_NAME \
  --src deploy.zip
```

### GitHub Actions CI/CD

The project includes a GitHub Actions workflow for automated deployment.

1. **Setup Azure Credentials**

Create a service principal:

```bash
az ad sp create-for-rbac \
  --name "travel-mcp-sp" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/travel-mcp-rg \
  --sdk-auth
```

2. **Configure GitHub Secrets**

Add the following secrets to your GitHub repository:
- `AZURE_CREDENTIALS`: Output from the service principal creation
- `APIM_PUBLISHER_EMAIL`: Your email for APIM
- `APIM_PUBLISHER_NAME`: Your organization name

3. **Push to Main Branch**

The workflow will automatically deploy on push to main branch.

## Using the MCP Server

### Get APIM Subscription Key

```bash
# List subscriptions
az apim subscription list \
  -API Integration

The server integrates with multiple external APIs to provide comprehensive travel information:

- **Skyscanner**: Flight search and pricing (read-only, no booking)
- **Met Office**: Weather forecasts and conditions
- **TripAdvisor**: Attractions, restaurants, and reviews

### Getting API Keys

See the detailed [API Integration Guide](docs/API_INTEGRATION.md) for:
- How to obtain API keys from each provider
- API rate limits and costs
- Configuration instructions
- Security best practices

**Important**: API keys are required for the server to function. The external API tools will return errors if API keys are not configured.

## Monitoring and Debugging
  --service-name <apim-name> \
  --output table

# Get subscription key
az apim subscription show \
  --resource-group travel-mcp-rg \
  --service-name <apim-name> \
  --sid <subscription-id> \
  --query primaryKey -o tsv
```

### Call the API through APIM

```bash
curl -X POST https://<apim-gateway-url>/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: <your-subscription-key>" \
  -d '{
    "method": "tools/call",
    Adding New Travel Guides

Edit `src/services/lonelyplanet.ts` and add entries to the curated guides.

### "params": {
      "name": "list_destinations",
      "arguments": {}
    }
  }'
```

### Configure in VS Code MCP Settings

Update `.vscode/mcp.json`:

```json
{
  "servers": {
    "travel-mcp": {
      "type": "http",
      "url": "https://<apim-gateway-url>/mcp/mcp",
      "headers": {
        "Ocp-Apim-Subscription-Key": "<your-subscription-key>"
      }
    }
  }
}
```

## Infrastructure Components

### Resources Created

- **App Service Plan**: Linux-based hosting plan (B1 SKU by default)
- **Web App**: Node.js 20 LTS application hosting
- **API Management**: API gateway with consumption tier
- **Application Insights**: Monitoring and logging
- **Log Analytics Workspace**: Centralized logging

### APIM Features

- **Rate Limiting**: 100 calls per minute per subscription
- **CORS**: Enabled for all origins
- **Subscription Keys**: Required for API access
- **Diagnostics**: Full logging to Application Insights
- **Products**: Travel MCP Product for API access management

## Monitoring and Debugging

### View Logs

```bash
# Web App logs
az webapp log tail --resource-group travel-mcp-rg --name <web-app-name>

# APIM logs
az monitor activity-log list --resource-group travel-mcp-rg --output table
```

### Application Insights

Access metrics and logs in the Azure Portal:
1. Navigate to Application Insights resource
2. Check "Live Metrics" for real-time monitoring
3. Use "Logs" for detailed query analysis

## Cost Estimation

Default configuration with free/developer tiers (monthly):
- App Service Plan (F1 Free): $0/month (60 minutes compute/day)
- API Management (Developer): ~$50/month (no SLA, dev/test only)
- Application Insights: First 5GB free, then ~$2.88/GB
- Log Analytics: First 5GB free, then ~$2.76/GB

**Estimated total**: ~$50/month for development/testing

**Production alternatives**:
- App Service Plan (B1): ~$13/month
- API Management (Consumption): ~$3.50 per million calls (production-ready)
- **Estimated production**: ~$15-20/month for low to medium traffic

**Note**: F1 and Developer tiers are suitable for development and testing only.

## Customization

### Adding New Destinations

Edit `src/index.ts` and add entries to the `destinations` array:

```typescript
{
  id: 'london',
  name: 'London, UK',
  description: 'Historic capital with royal palaces and museums',
  attractions: ['Big Ben', 'Tower of London', 'British Museum'],
  bestTimeToVisit: 'April to September',
  averageCost: '$150-300 per day',
  climate: 'Temperate maritime climate'
}
```

### Modifying APIM Policies

Edit the policy section in `infra/main.bicep`:

```xml
<policies>
  <inbound>
    <rate-limit-by-key calls="200" renewal-period="60" counter-key="@(context.Subscription.Id)" />
    <!-- Add custom policies here -->
  </inbound>
</policies>
```

## Troubleshooting

### Deployment Fails

- Ensure APIM name is globally unique
- Check that publisher email is valid
- Verify Azure subscription has sufficient quota

### Web App Not Responding

- Check Web App logs: `az webapp log tail`
- Verify environment variables are set correctly
- Ensure the build completed successfully

### APIM Returns 401

- Verify subscription key is correct
- Check that the subscription is active
- Ensure the API is published

## Security Best Practices

- Use Azure Key Vault for secrets
- Enable Azure AD authentication for APIM
- Configure IP restrictions on Web App
- Enable Web Application Firewall (WAF)
- Use managed identities for Azure resource access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check [API Integration Guide](docs/API_INTEGRATION.md) for API-specific issues
- Azure documentation: https://docs.microsoft.com/azure
- MCP specification: https://modelcontextprotocol.io

### API Provider Support
- **Skyscanner**: RapidAPI support portal
- **Met Office**: datahub@metoffice.gov.uk
- **TripAdvisor**: TripAdvisor API support