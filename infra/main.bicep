// Parameters
@description('The name of the environment (e.g., dev, staging, prod)')
param environmentName string = 'dev'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param resourcePrefix string = 'travel-mcp'

@description('The App Service Plan SKU')
@allowed([
  'F1'
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1v2'
  'P2v2'
  'P3v2'
])
param appServicePlanSku string = 'F1'

@description('The APIM SKU')
@allowed([
  'Consumption'
  'Developer'
  'Basic'
  'Standard'
  'Premium'
])
param apimSku string = 'Developer'

@description('Publisher email for APIM')
param publisherEmail string

@description('Publisher name for APIM')
param publisherName string

@description('Skyscanner API Key (optional)')
@secure()
param skyscannerApiKey string = ''

@description('Met Office API Key (optional)')
@secure()
param metOfficeApiKey string = ''

@description('TripAdvisor API Key (optional)')
@secure()
param tripAdvisorApiKey string = ''

@description('TripAdvisor Referer URL')
param tripAdvisorReferer string = ''

// Variables
var uniqueSuffix = uniqueString(resourceGroup().id)
var appServicePlanName = '${resourcePrefix}-asp-${environmentName}-${uniqueSuffix}'
var webAppName = '${resourcePrefix}-webapp-${environmentName}-${uniqueSuffix}'
var apimName = '${resourcePrefix}-apim-${environmentName}-${uniqueSuffix}'
var logAnalyticsName = '${resourcePrefix}-logs-${environmentName}-${uniqueSuffix}'
var appInsightsName = '${resourcePrefix}-ai-${environmentName}-${uniqueSuffix}'

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'HTTP_MODE'
          value: 'true'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'SKYSCANNER_API_KEY'
          value: skyscannerApiKey
        }
        {
          name: 'MET_OFFICE_API_KEY'
          value: metOfficeApiKey
        }
        {
          name: 'TRIPADVISOR_API_KEY'
          value: tripAdvisorApiKey
        }
        {
          name: 'TRIPADVISOR_REFERER'
          value: tripAdvisorReferer != '' ? tripAdvisorReferer : 'https://${webAppName}.azurewebsites.net'
        }
      ]
      cors: {
        allowedOrigins: [
          '*'
        ]
        supportCredentials: false
      }
    }
  }
}

// API Management
resource apim 'Microsoft.ApiManagement/service@2023-05-01-preview' = {
  name: apimName
  location: location
  sku: {
    name: apimSku
    capacity: apimSku == 'Consumption' ? 0 : 1
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
}

// APIM Logger
resource apimLogger 'Microsoft.ApiManagement/service/loggers@2023-05-01-preview' = {
  parent: apim
  name: 'app-insights-logger'
  properties: {
    loggerType: 'applicationInsights'
    resourceId: appInsights.id
    credentials: {
      instrumentationKey: appInsights.properties.InstrumentationKey
    }
  }
}

// APIM API for MCP Server
resource mcpApi 'Microsoft.ApiManagement/service/apis@2023-05-01-preview' = {
  parent: apim
  name: 'travel-mcp-api'
  properties: {
    displayName: 'Travel MCP API'
    description: 'Travel MCP Server API with AI tool capabilities'
    path: 'mcp'
    protocols: [
      'https'
    ]
    subscriptionRequired: true
    serviceUrl: 'https://${webApp.properties.defaultHostName}'
    subscriptionKeyParameterNames: {
      header: 'Ocp-Apim-Subscription-Key'
      query: 'subscription-key'
    }
  }
}

// APIM API Operations
resource mcpHealthOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: mcpApi
  name: 'health-check'
  properties: {
    displayName: 'Health Check'
    method: 'GET'
    urlTemplate: '/health'
    description: 'Health check endpoint'
    responses: [
      {
        statusCode: 200
        description: 'Success'
      }
    ]
  }
}

resource mcpToolsOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: mcpApi
  name: 'mcp-tools'
  properties: {
    displayName: 'MCP Tools'
    method: 'POST'
    urlTemplate: '/mcp'
    description: 'MCP protocol endpoint for tool calls'
    request: {
      description: 'MCP request payload'
      representations: [
        {
          contentType: 'application/json'
        }
      ]
    }
    responses: [
      {
        statusCode: 200
        description: 'Success'
        representations: [
          {
            contentType: 'application/json'
          }
        ]
      }
    ]
  }
}

// APIM Policy for the API
resource mcpApiPolicy 'Microsoft.ApiManagement/service/apis/policies@2023-05-01-preview' = {
  parent: mcpApi
  name: 'policy'
  properties: {
    value: '''
<policies>
  <inbound>
    <base />
    <set-backend-service base-url="https://${webApp.properties.defaultHostName}" />
    <cors allow-credentials="false">
      <allowed-origins>
        <origin>*</origin>
      </allowed-origins>
      <allowed-methods>
        <method>GET</method>
        <method>POST</method>
        <method>OPTIONS</method>
      </allowed-methods>
      <allowed-headers>
        <header>*</header>
      </allowed-headers>
    </cors>
    <rate-limit-by-key calls="100" renewal-period="60" counter-key="@(context.Subscription.Id)" />
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
'''
    format: 'xml'
  }
}

// APIM Diagnostics
resource apimDiagnostics 'Microsoft.ApiManagement/service/diagnostics@2023-05-01-preview' = {
  parent: apim
  name: 'applicationinsights'
  properties: {
    loggerId: apimLogger.id
    alwaysLog: 'allErrors'
    sampling: {
      samplingType: 'fixed'
      percentage: 100
    }
    logClientIp: true
    httpCorrelationProtocol: 'W3C'
    verbosity: 'information'
  }
}

// APIM Product
resource mcpProduct 'Microsoft.ApiManagement/service/products@2023-05-01-preview' = {
  parent: apim
  name: 'travel-mcp-product'
  properties: {
    displayName: 'Travel MCP Product'
    description: 'Access to Travel MCP Server API'
    subscriptionRequired: true
    approvalRequired: false
    state: 'published'
  }
}

// Link API to Product
resource productApi 'Microsoft.ApiManagement/service/products/apis@2023-05-01-preview' = {
  parent: mcpProduct
  name: mcpApi.name
}

// Outputs
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppName string = webApp.name
output apimGatewayUrl string = apim.properties.gatewayUrl
output apimName string = apim.name
output mcpApiPath string = '${apim.properties.gatewayUrl}/mcp'
output resourceGroupName string = resourceGroup().name
