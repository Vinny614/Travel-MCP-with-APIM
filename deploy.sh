#!/bin/bash

# Travel MCP Server Deployment Script
# This script deploys the Travel MCP Server to Azure with APIM

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it from https://nodejs.org/"
        exit 1
    fi
    
    print_info "All prerequisites are met."
}

# Login to Azure
azure_login() {
    print_info "Checking Azure login status..."
    
    if ! az account show &> /dev/null; then
        print_info "Logging in to Azure..."
        az login
    else
        print_info "Already logged in to Azure."
    fi
    
    # Show current subscription
    SUBSCRIPTION=$(az account show --query name -o tsv)
    print_info "Current subscription: $SUBSCRIPTION"
}

# Create resource group
create_resource_group() {
    local RG_NAME=$1
    local LOCATION=$2
    
    print_info "Creating resource group: $RG_NAME in $LOCATION..."
    
    if az group exists --name "$RG_NAME" | grep -q "true"; then
        print_warn "Resource group $RG_NAME already exists."
    else
        az group create --name "$RG_NAME" --location "$LOCATION"
        print_info "Resource group created successfully."
    fi
}

# Deploy Bicep template
deploy_infrastructure() {
    local RG_NAME=$1
    local PARAMS_FILE=$2
    
    print_info "Deploying infrastructure using Bicep..."
    
    DEPLOYMENT_NAME="travel-mcp-deployment-$(date +%Y%m%d%H%M%S)"
    
    az deployment group create \
        --name "$DEPLOYMENT_NAME" \
        --resource-group "$RG_NAME" \
        --template-file infra/main.bicep \
        --parameters "$PARAMS_FILE" \
        --output table
    
    print_info "Infrastructure deployment completed."
}

# Build and deploy application
deploy_application() {
    local RG_NAME=$1
    local WEB_APP_NAME=$2
    
    print_info "Building application..."
    npm install
    npm run build
    
    print_info "Creating deployment package..."
    # Create a zip file with the necessary files
    if [ -f deploy.zip ]; then
        rm deploy.zip
    fi
    
    zip -r deploy.zip dist/ node_modules/ package.json
    
    print_info "Deploying application to Web App: $WEB_APP_NAME..."
    az webapp deployment source config-zip \
        --resource-group "$RG_NAME" \
        --name "$WEB_APP_NAME" \
        --src deploy.zip
    
    print_info "Application deployed successfully."
    
    # Clean up
    rm deploy.zip
}

# Get deployment outputs
get_outputs() {
    local RG_NAME=$1
    
    print_info "Retrieving deployment outputs..."
    
    WEB_APP_URL=$(az deployment group show \
        --resource-group "$RG_NAME" \
        --name "$(az deployment group list --resource-group "$RG_NAME" --query "[0].name" -o tsv)" \
        --query properties.outputs.webAppUrl.value -o tsv)
    
    APIM_GATEWAY_URL=$(az deployment group show \
        --resource-group "$RG_NAME" \
        --name "$(az deployment group list --resource-group "$RG_NAME" --query "[0].name" -o tsv)" \
        --query properties.outputs.apimGatewayUrl.value -o tsv)
    
    MCP_API_PATH=$(az deployment group show \
        --resource-group "$RG_NAME" \
        --name "$(az deployment group list --resource-group "$RG_NAME" --query "[0].name" -o tsv)" \
        --query properties.outputs.mcpApiPath.value -o tsv)
    
    echo ""
    print_info "=========================================="
    print_info "Deployment completed successfully!"
    print_info "=========================================="
    echo ""
    echo "Web App URL: $WEB_APP_URL"
    echo "APIM Gateway URL: $APIM_GATEWAY_URL"
    echo "MCP API Endpoint: $MCP_API_PATH"
    echo ""
    print_info "To test the health endpoint, run:"
    echo "  curl $WEB_APP_URL/health"
    echo ""
    print_info "To get APIM subscription key, run:"
    echo "  az apim subscription list --resource-group $RG_NAME --service-name <apim-name> --output table"
    echo ""
}

# Main deployment flow
main() {
    print_info "Starting Travel MCP Server deployment..."
    
    # Default values
    RESOURCE_GROUP="${RESOURCE_GROUP:-travel-mcp-rg}"
    LOCATION="${LOCATION:-eastus}"
    PARAMS_FILE="${PARAMS_FILE:-infra/main.parameters.json}"
    
    # Check prerequisites
    check_prerequisites
    
    # Login to Azure
    azure_login
    
    # Create resource group
    create_resource_group "$RESOURCE_GROUP" "$LOCATION"
    
    # Deploy infrastructure
    deploy_infrastructure "$RESOURCE_GROUP" "$PARAMS_FILE"
    
    # Get the Web App name from deployment outputs
    WEB_APP_NAME=$(az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$(az deployment group list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)" \
        --query properties.outputs.webAppName.value -o tsv)
    
    # Deploy application
    deploy_application "$RESOURCE_GROUP" "$WEB_APP_NAME"
    
    # Show outputs
    get_outputs "$RESOURCE_GROUP"
}

# Run main function
main "$@"
