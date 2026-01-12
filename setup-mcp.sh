#!/bin/bash

# Quick setup script for Travel MCP Server in VS Code
# Run this after deploying to Azure

set -e

echo "🔧 Setting up Travel MCP Server configuration..."

# Get deployment outputs
RESOURCE_GROUP="${RESOURCE_GROUP:-travel-mcp-rg}"

echo "📡 Getting APIM information..."
APIM_NAME=$(az resource list --resource-group $RESOURCE_GROUP --resource-type Microsoft.ApiManagement/service --query "[0].name" -o tsv)

if [ -z "$APIM_NAME" ]; then
    echo "❌ Error: Could not find APIM service in resource group $RESOURCE_GROUP"
    echo "   Make sure you've deployed the infrastructure first."
    exit 1
fi

APIM_GATEWAY=$(az resource show --ids "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ApiManagement/service/$APIM_NAME" --query properties.gatewayUrl -o tsv | sed 's|https://||')

echo "🔑 Getting subscription key..."
# Get the built-in all-access subscription (master key)
SUBSCRIPTION_KEY=$(az rest --method post --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ApiManagement/service/$APIM_NAME/subscriptions/master/listSecrets?api-version=2023-05-01-preview" --query primaryKey -o tsv)

# Preserve existing MCP servers and add travel-mcp
echo "📝 Updating .vscode/mcp.json..."

# Backup existing file
if [ -f .vscode/mcp.json ]; then
    cp .vscode/mcp.json .vscode/mcp.json.backup
fi

# Create the updated configuration
cat > .vscode/mcp.json <<EOF
{
  "servers": {
    "microsoft-learn": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "avm-modules": {
      "type": "http",
      "url": "https://aca-avm-modules-7lsy3ktbwwv4k.gentlesmoke-c986cedd.uksouth.azurecontainerapps.io/mcp"
    },
    "azure-pricing": {
      "type": "http",
      "url": "https://aca-azure-pricing-7lsy3ktbwwv4k.gentlesmoke-c986cedd.uksouth.azurecontainerapps.io/mcp"
    },
    "markitdown": {
      "type": "http",
      "url": "https://aca-markitdown-7lsy3ktbwwv4k.gentlesmoke-c986cedd.uksouth.azurecontainerapps.io/mcp"
    },
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

echo ""
echo "✅ MCP configuration updated!"
echo ""
echo "📍 APIM Gateway: https://${APIM_GATEWAY}"
echo "🔗 MCP Endpoint: https://${APIM_GATEWAY}/mcp/mcp"
echo "🔑 Subscription Key: ${SUBSCRIPTION_KEY:0:10}..."
echo ""
echo "🧪 Test the connection with:"
echo "curl -X POST \"https://${APIM_GATEWAY}/mcp/mcp\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}\" \\"
echo "  -d '{\"method\": \"tools/list\"}'"
echo ""
echo "🎉 You can now use the Travel MCP Server in GitHub Copilot Chat!"
echo ""
echo "Try asking:"
echo "  - 'Search for flights from New York to London'"
echo "  - 'What's the weather in Paris?'"
echo "  - 'Find attractions in Tokyo'"
