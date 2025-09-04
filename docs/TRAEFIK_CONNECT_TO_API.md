# Traefik API Connection Guide

This document provides comprehensive instructions for connecting to and using the Traefik API in this project.

## API Access Configuration

The Traefik API is exposed through the `api@internal` service and is accessible at:
- **Base URL**: `http://gateway.localhost/api`
- **Dashboard**: `http://gateway.localhost/dashboard/`
- **Authentication**: Basic Auth (configured in `dynamic/middlewares.yml`)

## Authentication

### Current Credentials
- **Username**: `admin`
- **Password**: Contact administrator (hash stored in `dynamic/middlewares.yml`)

### Generating New Credentials
```bash
# Generate new password hash
docker run --rm httpd:2.4-alpine htpasswd -nbB admin "YourNewPassword"

# Output format: admin:$2y$05$HASH_VALUE
# Copy entire line to dynamic/middlewares.yml
```

## Connection Methods

### 1. Using cURL with Basic Auth

```bash
# Basic connection test
curl -u admin:password http://gateway.localhost/api/overview

# With explicit Authorization header
curl -H "Authorization: Basic $(echo -n 'admin:password' | base64)" \
     http://gateway.localhost/api/overview
```

### 2. Using Python (requests)

```python
import requests
from requests.auth import HTTPBasicAuth

# Configuration
BASE_URL = "http://gateway.localhost/api"
USERNAME = "admin"
PASSWORD = "your_password"

# Create session with authentication
session = requests.Session()
session.auth = HTTPBasicAuth(USERNAME, PASSWORD)

# Example: Get overview
response = session.get(f"{BASE_URL}/overview")
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"Error: {response.status_code}")

# Example: Get all HTTP routers
routers = session.get(f"{BASE_URL}/http/routers").json()
for router in routers:
    print(f"Router: {router['name']} - Rule: {router['rule']}")
```

### 3. Using Node.js (axios)

```javascript
const axios = require('axios');

// Configuration
const BASE_URL = 'http://gateway.localhost/api';
const auth = {
  username: 'admin',
  password: 'your_password'
};

// Create axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  auth: auth,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Example: Get overview
async function getOverview() {
  try {
    const response = await api.get('/overview');
    console.log('Overview:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.status || error.message);
  }
}

// Example: Get all services
async function getServices() {
  try {
    const response = await api.get('/http/services');
    response.data.forEach(service => {
      console.log(`Service: ${service.name} - Type: ${service.type}`);
    });
  } catch (error) {
    console.error('Error:', error.response?.status || error.message);
  }
}

getOverview();
getServices();
```

### 4. Using PowerShell

```powershell
# Set credentials
$username = "admin"
$password = "your_password"
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(("{0}:{1}" -f $username,$password)))

# API base URL
$baseUrl = "http://gateway.localhost/api"

# Example: Get overview
$headers = @{
    Authorization=("Basic {0}" -f $base64AuthInfo)
}
$response = Invoke-RestMethod -Uri "$baseUrl/overview" -Method Get -Headers $headers
$response | ConvertTo-Json

# Example: Get all routers with error handling
try {
    $routers = Invoke-RestMethod -Uri "$baseUrl/http/routers" -Method Get -Headers $headers
    foreach ($router in $routers) {
        Write-Host "Router: $($router.name) - Rule: $($router.rule)"
    }
} catch {
    Write-Host "Error: $_"
}
```

### 5. Using Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

const (
    baseURL  = "http://gateway.localhost/api"
    username = "admin"
    password = "your_password"
)

func main() {
    // Create HTTP client
    client := &http.Client{}

    // Example: Get overview
    overview, err := makeRequest(client, "/overview")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("Overview: %s\n", overview)

    // Example: Get routers
    routers, err := makeRequest(client, "/http/routers")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    
    var routerList []map[string]interface{}
    json.Unmarshal([]byte(routers), &routerList)
    for _, router := range routerList {
        fmt.Printf("Router: %s\n", router["name"])
    }
}

func makeRequest(client *http.Client, endpoint string) (string, error) {
    req, err := http.NewRequest("GET", baseURL+endpoint, nil)
    if err != nil {
        return "", err
    }
    
    req.SetBasicAuth(username, password)
    
    resp, err := client.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    
    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }
    
    return string(body), nil
}
```

## Complete API Endpoints Reference

### HTTP Configuration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/http/routers` | List all HTTP routers |
| GET | `/api/http/routers/{name}` | Get specific HTTP router details |
| GET | `/api/http/services` | List all HTTP services |
| GET | `/api/http/services/{name}` | Get specific HTTP service details |
| GET | `/api/http/middlewares` | List all HTTP middlewares |
| GET | `/api/http/middlewares/{name}` | Get specific HTTP middleware details |

### TCP Configuration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tcp/routers` | List all TCP routers |
| GET | `/api/tcp/routers/{name}` | Get specific TCP router details |
| GET | `/api/tcp/services` | List all TCP services |
| GET | `/api/tcp/services/{name}` | Get specific TCP service details |
| GET | `/api/tcp/middlewares` | List all TCP middlewares |
| GET | `/api/tcp/middlewares/{name}` | Get specific TCP middleware details |

### UDP Configuration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/udp/routers` | List all UDP routers |
| GET | `/api/udp/routers/{name}` | Get specific UDP router details |
| GET | `/api/udp/services` | List all UDP services |
| GET | `/api/udp/services/{name}` | Get specific UDP service details |

### General Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entrypoints` | List all entry points |
| GET | `/api/entrypoints/{name}` | Get specific entry point details |
| GET | `/api/overview` | Get statistics and feature information |
| GET | `/api/rawdata` | Get complete dynamic configuration |
| GET | `/api/version` | Get Traefik version information |

### Debug Endpoints (when enabled)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/debug/vars` | Runtime variables |
| GET | `/debug/pprof/` | Profiling index |
| GET | `/debug/pprof/cmdline` | Command line |
| GET | `/debug/pprof/profile` | CPU profile |
| GET | `/debug/pprof/symbol` | Symbol table |
| GET | `/debug/pprof/trace` | Execution trace |

## Pagination

For endpoints returning lists, pagination is supported:

```bash
# Default: 100 items per page
curl -u admin:password http://gateway.localhost/api/http/routers

# Custom pagination
curl -u admin:password "http://gateway.localhost/api/http/routers?page=2&per_page=50"

# Check for next page in response header
# Header: X-Next-Page
```

### Python Pagination Example

```python
def get_all_routers(session, base_url):
    all_routers = []
    page = 1
    per_page = 50
    
    while True:
        response = session.get(
            f"{base_url}/http/routers",
            params={'page': page, 'per_page': per_page}
        )
        
        if response.status_code != 200:
            break
            
        routers = response.json()
        all_routers.extend(routers)
        
        # Check if there's a next page
        next_page = response.headers.get('X-Next-Page')
        if not next_page:
            break
            
        page += 1
    
    return all_routers
```

## Response Format Examples

### Overview Response
```json
{
  "http": {
    "routers": {
      "total": 5,
      "warnings": 0,
      "errors": 0
    },
    "services": {
      "total": 5,
      "warnings": 0,
      "errors": 0
    },
    "middlewares": {
      "total": 1,
      "warnings": 0,
      "errors": 0
    }
  },
  "tcp": {
    "routers": {
      "total": 0,
      "warnings": 0,
      "errors": 0
    },
    "services": {
      "total": 0,
      "warnings": 0,
      "errors": 0
    }
  },
  "features": {
    "tracing": "disabled",
    "metrics": "disabled",
    "accessLog": "disabled"
  },
  "providers": ["docker", "file"]
}
```

### Router Response Example
```json
{
  "name": "whoami@docker",
  "provider": "docker",
  "status": "enabled",
  "rule": "Host(`whoami.localhost`)",
  "entryPoints": ["web"],
  "service": "whoami-service@docker",
  "middlewares": [],
  "priority": 0,
  "tls": null
}
```

### Service Response Example
```json
{
  "name": "whoami-service@docker",
  "provider": "docker",
  "type": "loadbalancer",
  "status": "enabled",
  "loadBalancer": {
    "servers": [
      {
        "url": "http://172.18.0.4:80"
      }
    ],
    "passHostHeader": true
  },
  "serverStatus": {
    "http://172.18.0.4:80": "UP"
  }
}
```

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response data |
| 401 | Unauthorized | Check credentials |
| 404 | Not Found | Verify endpoint/resource name |
| 500 | Server Error | Check Traefik logs |

### Error Handling Example (Python)

```python
import requests
from requests.auth import HTTPBasicAuth

def safe_api_call(endpoint, username, password):
    try:
        response = requests.get(
            f"http://gateway.localhost/api{endpoint}",
            auth=HTTPBasicAuth(username, password),
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            print("Authentication failed. Check credentials.")
        elif response.status_code == 404:
            print(f"Endpoint not found: {endpoint}")
        else:
            print(f"Unexpected status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("Cannot connect to Traefik API. Is the service running?")
    except requests.exceptions.Timeout:
        print("Request timed out")
    except Exception as e:
        print(f"Unexpected error: {e}")
    
    return None

# Usage
data = safe_api_call("/overview", "admin", "password")
if data:
    print(f"Total HTTP routers: {data['http']['routers']['total']}")
```

## Monitoring Script Example

```python
#!/usr/bin/env python3
"""
Traefik API Monitor - Continuously monitor service health
"""

import requests
import time
import json
from requests.auth import HTTPBasicAuth
from datetime import datetime

class TraefikMonitor:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(username, password)
    
    def get_service_health(self):
        """Get health status of all services"""
        try:
            services = self.session.get(f"{self.base_url}/http/services").json()
            health_report = []
            
            for service in services:
                name = service.get('name', 'unknown')
                status = service.get('status', 'unknown')
                server_status = service.get('serverStatus', {})
                
                health_report.append({
                    'name': name,
                    'status': status,
                    'servers': server_status
                })
            
            return health_report
        except Exception as e:
            print(f"Error getting service health: {e}")
            return []
    
    def monitor(self, interval=30):
        """Monitor services continuously"""
        print(f"Starting Traefik monitor (interval: {interval}s)")
        
        while True:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n[{timestamp}] Checking services...")
            
            health = self.get_service_health()
            
            for service in health:
                print(f"  - {service['name']}: {service['status']}")
                for server, status in service['servers'].items():
                    status_symbol = "✓" if status == "UP" else "✗"
                    print(f"    {status_symbol} {server}: {status}")
            
            time.sleep(interval)

# Usage
if __name__ == "__main__":
    monitor = TraefikMonitor(
        base_url="http://gateway.localhost/api",
        username="admin",
        password="your_password"
    )
    
    try:
        monitor.monitor(interval=30)
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
```

## Testing API Connection

### Quick Test Script (bash)

```bash
#!/bin/bash

# test_traefik_api.sh
API_URL="http://gateway.localhost/api"
USERNAME="admin"
PASSWORD="your_password"

echo "Testing Traefik API connection..."

# Test overview endpoint
echo -n "Testing /overview: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -u $USERNAME:$PASSWORD $API_URL/overview)
if [ $STATUS -eq 200 ]; then
    echo "✓ Success"
else
    echo "✗ Failed (HTTP $STATUS)"
fi

# Test routers endpoint
echo -n "Testing /http/routers: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -u $USERNAME:$PASSWORD $API_URL/http/routers)
if [ $STATUS -eq 200 ]; then
    echo "✓ Success"
else
    echo "✗ Failed (HTTP $STATUS)"
fi

# Test services endpoint
echo -n "Testing /http/services: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -u $USERNAME:$PASSWORD $API_URL/http/services)
if [ $STATUS -eq 200 ]; then
    echo "✓ Success"
else
    echo "✗ Failed (HTTP $STATUS)"
fi

echo "Test complete."
```

## Security Best Practices

1. **Never hardcode credentials** - Use environment variables or secure vaults
2. **Use HTTPS in production** - Enable Let's Encrypt or provide certificates
3. **Restrict API access** - Use firewall rules or network policies
4. **Rotate credentials regularly** - Update Basic Auth passwords periodically
5. **Monitor API access** - Log and audit API usage
6. **Use read-only access** - The API is read-only by design, maintain this

## Troubleshooting

### Cannot Connect to API

```bash
# Check if Traefik is running
docker ps | grep traefik

# Check Traefik logs
docker logs traefik-gateway

# Verify API is enabled in configuration
docker exec traefik-gateway cat /etc/traefik/traefik.yml | grep api

# Test local connectivity
curl -v http://gateway.localhost/api/overview
```

### Authentication Issues

```bash
# Verify credentials format
echo -n "admin:password" | base64

# Check middleware configuration
cat dynamic/middlewares.yml

# Test with explicit header
curl -H "Authorization: Basic $(echo -n 'admin:password' | base64)" \
     http://gateway.localhost/api/overview
```

### Missing Endpoints

```bash
# Verify Traefik version
curl -u admin:password http://gateway.localhost/api/version

# Check if debug mode is enabled for debug endpoints
docker exec traefik-gateway cat /etc/traefik/traefik.yml | grep debug
```

## Advanced Usage

### Export Configuration

```python
#!/usr/bin/env python3
"""Export complete Traefik configuration to JSON"""

import requests
import json
from requests.auth import HTTPBasicAuth

def export_config(base_url, username, password, output_file="traefik_config.json"):
    session = requests.Session()
    session.auth = HTTPBasicAuth(username, password)
    
    config = {}
    
    # Fetch all configuration
    endpoints = [
        "/overview",
        "/http/routers",
        "/http/services", 
        "/http/middlewares",
        "/tcp/routers",
        "/tcp/services",
        "/entrypoints",
        "/rawdata"
    ]
    
    for endpoint in endpoints:
        try:
            response = session.get(f"{base_url}{endpoint}")
            if response.status_code == 200:
                config[endpoint] = response.json()
                print(f"✓ Exported {endpoint}")
            else:
                print(f"✗ Failed to export {endpoint}")
        except Exception as e:
            print(f"✗ Error exporting {endpoint}: {e}")
    
    # Save to file
    with open(output_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"\nConfiguration exported to {output_file}")

# Usage
export_config(
    base_url="http://gateway.localhost/api",
    username="admin",
    password="your_password"
)
```

### Service Discovery Integration

```python
#!/usr/bin/env python3
"""Integrate Traefik services with external service discovery"""

import requests
from requests.auth import HTTPBasicAuth

class TraefikServiceDiscovery:
    def __init__(self, api_url, username, password):
        self.api_url = api_url
        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(username, password)
    
    def get_service_endpoints(self):
        """Extract all service endpoints for external registration"""
        endpoints = []
        
        try:
            services = self.session.get(f"{self.api_url}/http/services").json()
            
            for service in services:
                if 'loadBalancer' in service:
                    for server in service['loadBalancer'].get('servers', []):
                        endpoints.append({
                            'name': service['name'],
                            'url': server['url'],
                            'provider': service.get('provider', 'unknown')
                        })
        except Exception as e:
            print(f"Error discovering services: {e}")
        
        return endpoints
    
    def export_prometheus_targets(self, output_file="targets.json"):
        """Export service targets for Prometheus service discovery"""
        endpoints = self.get_service_endpoints()
        
        targets = []
        for endpoint in endpoints:
            # Parse URL to extract host:port
            url = endpoint['url'].replace('http://', '').replace('https://', '')
            targets.append({
                'targets': [url],
                'labels': {
                    'service': endpoint['name'],
                    'provider': endpoint['provider']
                }
            })
        
        import json
        with open(output_file, 'w') as f:
            json.dump(targets, f, indent=2)
        
        print(f"Exported {len(targets)} targets to {output_file}")

# Usage
discovery = TraefikServiceDiscovery(
    api_url="http://gateway.localhost/api",
    username="admin",
    password="your_password"
)

# Get all endpoints
endpoints = discovery.get_service_endpoints()
for ep in endpoints:
    print(f"{ep['name']}: {ep['url']}")

# Export for Prometheus
discovery.export_prometheus_targets()
```

## Notes

- The Traefik API is **read-only** - you cannot modify configuration through the API
- Configuration changes must be made through Docker labels or dynamic configuration files
- The API reflects the current runtime state of Traefik
- Pagination is automatic for large result sets (check `X-Next-Page` header)
- All timestamps in responses are in RFC3339 format
- The API is synchronous - responses reflect immediate state

## References

- [Official Traefik API Documentation](https://doc.traefik.io/traefik/operations/api/)
- [Traefik Configuration Discovery](https://doc.traefik.io/traefik/providers/overview/)
- [Basic Authentication Middleware](https://doc.traefik.io/traefik/middlewares/http/basicauth/)