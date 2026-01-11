# External API Integration Guide

This document explains how to integrate external APIs with the Travel MCP Server.

**Important**: API keys are required for all external API integrations. The server will return errors if API keys are not configured.

## API Providers

### 1. Skyscanner API

**Purpose**: Flight search and pricing information

**Getting Started**:
1. Visit [RapidAPI Skyscanner](https://rapidapi.com/skyscanner/api/skyscanner-flight-search)
2. Sign up for a free account
3. Subscribe to the Skyscanner Flight Search API
4. Copy your API key from the dashboard

**Features Used**:
- Flight search (live pricing)
- Place autocomplete
- Multi-city search support

**Rate Limits**: Varies by subscription tier (Free tier: ~500 requests/month)

**Cost**: Free tier available, paid plans from $10/month

### 2. Met Office DataHub API

**Purpose**: Weather forecasts for UK and international locations

**Getting Started**:
1. Visit [Met Office DataHub](https://datahub.metoffice.gov.uk/)
2. Create a free account
3. Subscribe to the "Site Specific Forecast" API
4. Generate an API key

**Features Used**:
- 7-day weather forecasts
- Hourly weather data
- Location search

**Rate Limits**: 5,000 requests per day (free tier)

**Cost**: Free for non-commercial use

### 3. TripAdvisor Content API

**Purpose**: Attractions, restaurants, and reviews

**Getting Started**:
1. Visit [TripAdvisor Content API](https://tripadvisor-content-api.readme.io/)
2. Request API access (requires application review)
3. Obtain your API key
4. Set your referer URL

**Features Used**:
- Location search
- Attraction listings
- Restaurant search
- Reviews and ratings

**Rate Limits**: 
- 500 API calls per day (free tier)
- 5 requests per second

**Cost**: Free tier available, contact for commercial licensing

## Configuration

### Local Development

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your API keys to `.env`:
```bash
SKYSCANNER_API_KEY=your_skyscanner_key_here
MET_OFFICE_API_KEY=your_met_office_key_here
TRIPADVISOR_API_KEY=your_tripadvisor_key_here
TRIPADVISOR_REFERER=http://localhost:3000
```

### Azure Deployment

API keys can be configured in two ways:

#### Option 1: Parameters File (Not Recommended for Production)

Edit `infra/main.parameters.json`:
```json
{
  "skyscannerApiKey": {
    "value": "your-key-here"
  },
  "metOfficeApiKey": {
    "value": "your-key-here"
  },
  "tripAdvisorApiKey": {
    "value": "your-key-here"
  }
}
```

#### Option 2: Azure Key Vault (Recommended for Production)

1. Create an Azure Key Vault:
```bash
az keyvault create \
  --name travel-mcp-vault \
  --resource-group travel-mcp-rg \
  --location eastus
```

2. Store secrets:
```bash
az keyvault secret set --vault-name travel-mcp-vault --name skyscanner-api-key --value "your-key"
az keyvault secret set --vault-name travel-mcp-vault --name met-office-api-key --value "your-key"
az keyvault secret set --vault-name travel-mcp-vault --name tripadvisor-api-key --value "your-key"
```

3. Update the Bicep template to reference Key Vault (see example below)

#### Option 3: Command Line Parameters

```bash
az deployment group create \
  --resource-group travel-mcp-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters skyscannerApiKey="your-key" \
             metOfficeApiKey="your-key" \
             tripAdvisorApiKey="your-key"
```

## Error Handling

All API clients implement error handling that throws descriptive errors when API keys are missing or API calls fail:

```typescript
if (!this.apiKey) {
  throw new Error('API key is required. Please configure the environment variable.');
}

### Flight Search
```json
{
  "flights": [
    {
      "price": 450,
      "currency": "USD",
      "airline": "British Airways",
      "departure": "JFK 2026-03-15 10:30",
      "arrival": "LHR 2026-03-15 22:45",
      "duration": "8h 15m",
      "stops": 0
    }
  ],
  "note": "Flight information is for reference only..."
}
```

### Weather Forecast
```json
[
  {
    "date": "2026-01-12",
    "location": "London",
    "temperature": {
      "max": 15,
      "min": 8,
      "unit": "C"
    },
    "conditions": "Partly Cloudy",
    "precipitation": 10,
    "windSpeed": 15,
    "humidity": 70
  }
]
```

### Attractions
```json
[
  {
    "name": "British Museum",
    "description": "World-famous museum with vast collections",
    "rating": 4.7,
    "reviewCount": 45234,
    "category": "Museum",
    "priceLevel": "Free"
  }
]
```

## Rate Limiting Best Practices

1. **Cache responses** where appropriate
2. **Implement retry logic** with exponential backoff
3. **Monitor usage** through Azure Application Insights
4. **Set up alerts** for rate limit warnings
5. **Use APIM** for centralized rate limiting

## Error Handling

All API clients implement graceful error handling:

```typescript
try {
  const data = await apiClient.getData();
  return data;
} catch (error) {
  console.error('API error:', error);
  throw error; // Propagate error to caller
}
```

Users will receive clear error messages when API keys are not configured or when API calls fail.

## Cost Optimization

To minimize API costs:

1. **Cache frequently requested data**
2. **Use mock data for development**
3. **Implement request throttling**
4. **Monitor usage dashboards**
5. **Set budget alerts in Azure**

## Security Considerations

1. **Never commit API keys** to version control
2. **Use Azure Key Vault** for production secrets
3. **Rotate keys regularly**
4. **Enable APIM subscription keys**
5. **Monitor for unusual activity**
6. **Use HTTPS only**

## Testing

Test the APIs locally:

```bash
# Test flight search
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

# Test weather forecast
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_weather_forecast",
      "arguments": {
        "location": "London",
        "days": 5
      }
    }
  }'
```

## Troubleshooting

### API Returns 401 Unauthorized
- Verify API key is correct
- Check if API key has expired
- Ensure API subscription is active

### API Returns 429 Too Many Requests
- Rate limit exceeded
- Implement exponential backoff
- Upgrade API subscription tier

### API Returns No Data
- Check if location/query is valid
- Verify API endpoint URLs
- Check API service status

## Support

For API-specific issues, contact:
- **Skyscanner**: RapidAPI support
- **Met Office**: datahub@metoffice.gov.uk
- **TripAdvisor**: API support portal
