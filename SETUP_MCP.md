# Setup Travel MCP Server in VS Code

After deploying your Travel MCP Server to Azure, follow these steps to use it in your VS Code codespace.

## Step 1: Get Your Deployment Information

After running the deployment script, you'll receive output containing:

```
Web App URL: https://travel-mcp-webapp-dev-xxxxx.azurewebsites.net
APIM Gateway URL: https://travel-mcp-apim-dev-xxxxx.azure-api.net
MCP API Endpoint: https://travel-mcp-apim-dev-xxxxx.azure-api.net/mcp
```

Save these values for the next steps.

## Step 2: Get Your APIM Subscription Key

Run this command to get your subscription key:

```bash
# Get resource group name
RESOURCE_GROUP="travel-mcp-rg"

# Get APIM service name
APIM_NAME=$(az apim list --resource-group $RESOURCE_GROUP --query "[0].name" -o tsv)

# List all subscriptions
az apim subscription list \
  --resource-group $RESOURCE_GROUP \
  --service-name $APIM_NAME \
  --output table

# Get the primary key for the product subscription
az apim subscription show \
  --resource-group $RESOURCE_GROUP \
  --service-name $APIM_NAME \
  --sid $(az apim subscription list --resource-group $RESOURCE_GROUP --service-name $APIM_NAME --query "[?contains(displayName, 'Travel')].name" -o tsv) \
  --query primaryKey \
  -o tsv
```

## Step 3: Update .vscode/mcp.json

Edit `.vscode/mcp.json` and replace the placeholder values:

```json
{
  "servers": {
    "travel-mcp": {
      "type": "http",
      "url": "https://YOUR-APIM-GATEWAY-URL/mcp/mcp",
      "headers": {
        "Ocp-Apim-Subscription-Key": "YOUR-SUBSCRIPTION-KEY"
      }
    }
  }
}
```

Replace:
- `YOUR-APIM-GATEWAY-URL` with your APIM Gateway URL (e.g., `travel-mcp-apim-dev-xxxxx.azure-api.net`)
- `YOUR-SUBSCRIPTION-KEY` with the subscription key from Step 2

**Example:**
```json
{
  "servers": {
    "travel-mcp": {
      "type": "http",
      "url": "https://travel-mcp-apim-dev-ab1cd2.azure-api.net/mcp/mcp",
      "headers": {
        "Ocp-Apim-Subscription-Key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
      },
      "description": "Travel MCP Server - flights, weather, attractions, restaurants"
    }
  }
}
```

## Step 4: Test the Connection

You can test the connection using curl:

```bash
# Replace with your actual values
APIM_GATEWAY_URL="your-apim-gateway-url"
SUBSCRIPTION_KEY="your-subscription-key"

# Test listing tools
curl -X POST "https://${APIM_GATEWAY_URL}/mcp/mcp" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}" \
  -d '{
    "method": "tools/list"
  }'

# Test searching for flights
curl -X POST "https://${APIM_GATEWAY_URL}/mcp/mcp" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}" \
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
```

## Step 5: Use in GitHub Copilot Chat

Once configured, you can use the Travel MCP Server in GitHub Copilot Chat:

**Example prompts:**
- "Search for flights from New York to London departing March 15"
- "What's the weather forecast for Paris for the next 5 days?"
- "Find top attractions in Tokyo"
- "Search for Italian restaurants in Barcelona"
- "Get travel tips for packing"

## Available Tools

Your Travel MCP Server provides these tools:

1. **search_flights** - Find flights between locations
2. **get_weather_forecast** - Get weather predictions
3. **search_attractions** - Find attractions and things to do
4. **search_restaurants** - Find restaurants by location/cuisine
5. **list_destinations** - List travel destinations
6. **get_destination_info** - Get detailed destination info
7. **search_destinations** - Search destinations by keyword
8. **get_travel_tips** - Get travel tips by category

## Troubleshooting

### Error: "401 Unauthorized"
- Check that your subscription key is correct
- Verify the subscription is active in APIM

### Error: "404 Not Found"
- Verify the APIM Gateway URL is correct
- Ensure the API path includes `/mcp/mcp`

### Error: Connection timeout
- Check that the Web App is running: `az webapp show --name <webapp-name> --resource-group travel-mcp-rg --query state`
- Restart if needed: `az webapp restart --name <webapp-name> --resource-group travel-mcp-rg`

### API Keys Not Working
- Make sure you've configured the external API keys in Azure:
  - SKYSCANNER_API_KEY
  - MET_OFFICE_API_KEY
  - TRIPADVISOR_API_KEY

Check App Settings:
```bash
az webapp config appsettings list \
  --name <webapp-name> \
  --resource-group travel-mcp-rg \
  --query "[?name=='SKYSCANNER_API_KEY' || name=='MET_OFFICE_API_KEY' || name=='TRIPADVISOR_API_KEY']"
```

## Security Notes

- **Never commit** your subscription key to version control
- `.vscode/mcp.json` is already in `.gitignore`
- Rotate keys regularly in the Azure Portal
- Use different keys for different environments (dev/prod)

## Quick Setup Script

Save this as `setup-mcp.sh` for quick configuration:

```bash
#!/bin/bash

# Get deployment outputs
RESOURCE_GROUP="travel-mcp-rg"
APIM_NAME=$(az apim list --resource-group $RESOURCE_GROUP --query "[0].name" -o tsv)
APIM_GATEWAY=$(az apim show --resource-group $RESOURCE_GROUP --name $APIM_NAME --query gatewayUrl -o tsv | sed 's|https://||')

# Get subscription key
SUBSCRIPTION_KEY=$(az apim subscription show \
  --resource-group $RESOURCE_GROUP \
  --service-name $APIM_NAME \
  --sid $(az apim subscription list --resource-group $RESOURCE_GROUP --service-name $APIM_NAME --query "[?contains(displayName, 'Travel')].name" -o tsv) \
  --query primaryKey \
  -o tsv)

# Update mcp.json
cat > .vscode/mcp.json <<EOF
{
  "servers": {
    "travel-mcp": {
      "type": "http",
      "url": "https://${APIM_GATEWAY}/mcp/mcp",
      "headers": {
        "Ocp-Apim-Subscription-Key": "${SUBSCRIPTION_KEY}"
      },
      "description": "Travel MCP Server - flights, weather, attractions, restaurants"
    }
  }
}
EOF

echo "✅ MCP configuration updated!"
echo "URL: https://${APIM_GATEWAY}/mcp/mcp"
echo "You can now use the Travel MCP Server in GitHub Copilot Chat"
```

Make it executable and run:
```bash
chmod +x setup-mcp.sh
./setup-mcp.sh
```
