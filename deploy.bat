@echo off
REM Travel MCP Server Deployment Script for Windows
REM This script deploys the Travel MCP Server to Azure with APIM

setlocal enabledelayedexpansion

REM Default values
set "RESOURCE_GROUP=travel-mcp-rg"
set "LOCATION=eastus"
set "PARAMS_FILE=infra\main.parameters.json"

echo [INFO] Starting Travel MCP Server deployment...

REM Check if Azure CLI is installed
where az >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    exit /b 1
)

echo [INFO] All prerequisites are met.

REM Check Azure login status
echo [INFO] Checking Azure login status...
az account show >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Logging in to Azure...
    call az login
)

REM Show current subscription
for /f "tokens=*" %%a in ('az account show --query name -o tsv') do set SUBSCRIPTION=%%a
echo [INFO] Current subscription: %SUBSCRIPTION%

REM Create resource group
echo [INFO] Creating resource group: %RESOURCE_GROUP% in %LOCATION%...
az group exists --name "%RESOURCE_GROUP%" | findstr "true" >nul
if %ERRORLEVEL% equ 0 (
    echo [WARN] Resource group %RESOURCE_GROUP% already exists.
) else (
    call az group create --name "%RESOURCE_GROUP%" --location "%LOCATION%"
    echo [INFO] Resource group created successfully.
)

REM Deploy infrastructure
echo [INFO] Deploying infrastructure using Bicep...
set "DEPLOYMENT_NAME=travel-mcp-deployment-%date:~10,4%%date:~4,2%%date:~7,2%%time:~0,2%%time:~3,2%%time:~6,2%"
set "DEPLOYMENT_NAME=%DEPLOYMENT_NAME: =0%"

call az deployment group create ^
    --name "%DEPLOYMENT_NAME%" ^
    --resource-group "%RESOURCE_GROUP%" ^
    --template-file infra\main.bicep ^
    --parameters "%PARAMS_FILE%" ^
    --output table

echo [INFO] Infrastructure deployment completed.

REM Get Web App name
for /f "tokens=*" %%a in ('az deployment group list --resource-group "%RESOURCE_GROUP%" --query "[0].name" -o tsv') do set LATEST_DEPLOYMENT=%%a
for /f "tokens=*" %%a in ('az deployment group show --resource-group "%RESOURCE_GROUP%" --name "%LATEST_DEPLOYMENT%" --query properties.outputs.webAppName.value -o tsv') do set WEB_APP_NAME=%%a

REM Build application
echo [INFO] Building application...
call npm install
call npm run build

REM Create deployment package
echo [INFO] Creating deployment package...
if exist deploy.zip del deploy.zip
powershell -command "Compress-Archive -Path dist,node_modules,package.json -DestinationPath deploy.zip -Force"

REM Deploy application
echo [INFO] Deploying application to Web App: %WEB_APP_NAME%...
call az webapp deployment source config-zip ^
    --resource-group "%RESOURCE_GROUP%" ^
    --name "%WEB_APP_NAME%" ^
    --src deploy.zip

echo [INFO] Application deployed successfully.

REM Clean up
del deploy.zip

REM Get deployment outputs
echo [INFO] Retrieving deployment outputs...
for /f "tokens=*" %%a in ('az deployment group show --resource-group "%RESOURCE_GROUP%" --name "%LATEST_DEPLOYMENT%" --query properties.outputs.webAppUrl.value -o tsv') do set WEB_APP_URL=%%a
for /f "tokens=*" %%a in ('az deployment group show --resource-group "%RESOURCE_GROUP%" --name "%LATEST_DEPLOYMENT%" --query properties.outputs.apimGatewayUrl.value -o tsv') do set APIM_GATEWAY_URL=%%a
for /f "tokens=*" %%a in ('az deployment group show --resource-group "%RESOURCE_GROUP%" --name "%LATEST_DEPLOYMENT%" --query properties.outputs.mcpApiPath.value -o tsv') do set MCP_API_PATH=%%a

echo.
echo ==========================================
echo [INFO] Deployment completed successfully!
echo ==========================================
echo.
echo Web App URL: %WEB_APP_URL%
echo APIM Gateway URL: %APIM_GATEWAY_URL%
echo MCP API Endpoint: %MCP_API_PATH%
echo.
echo [INFO] To test the health endpoint, run:
echo   curl %WEB_APP_URL%/health
echo.
echo [INFO] To get APIM subscription key, run:
echo   az apim subscription list --resource-group %RESOURCE_GROUP% --service-name ^<apim-name^> --output table
echo.

endlocal
