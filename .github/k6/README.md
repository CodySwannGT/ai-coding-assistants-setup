# K6 Load Testing Workflow

This directory contains the k6 load testing workflow and related configurations for performance testing applications after deployment.

## Overview

The k6 load testing workflow is designed as a **callable workflow** that can be integrated into any deployment pipeline. It provides:

- Multiple test scenarios (smoke, load, stress, spike, soak)
- Configurable thresholds and performance criteria
- Support for both local and k6 Cloud runs
- Detailed reporting and GitHub Actions integration
- Flexible authentication for testing protected endpoints

## Directory Structure

```
.github/k6/
├── README.md                    # This file
├── scripts/                     # Test scripts
│   ├── default-test.js         # Default test with all scenarios
│   ├── api-test.js            # Comprehensive API testing
│   └── browser-test.js        # Browser testing (coming soon)
├── scenarios/                   # Scenario configurations and scripts
│   ├── smoke.json             # Smoke test configuration
│   ├── smoke.js               # Smoke test implementation
│   ├── load.json              # Load test configuration
│   ├── load.js                # Load test implementation
│   ├── stress.json            # Stress test configuration
│   ├── stress.js              # Stress test implementation
│   ├── spike.json             # Spike test configuration
│   ├── spike.js               # Spike test implementation
│   ├── soak.json              # Soak test configuration
│   └── soak.js                # Soak test implementation
├── thresholds/                  # Threshold configurations
│   ├── strict.json            # Strict performance criteria
│   ├── normal.json            # Standard criteria
│   └── relaxed.json           # Relaxed criteria for development
└── examples/                    # Integration and usage examples
    ├── customer-deploy-integration.yml
    └── data-driven-test.js    # Data parameterization example
```

## Usage

### Basic Integration

Add this to your deployment workflow:

```yaml
jobs:
  deploy:
    # ... your deployment steps ...
    
  performance_test:
    needs: deploy
    uses: ./.github/workflows/k6-load-test.yml
    with:
      environment: staging
      test_scenario: smoke
      base_url: ${{ needs.deploy.outputs.app_url }}
    secrets: inherit
```

### Available Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `environment` | Target environment (staging, production) | Yes | - |
| `test_scenario` | Test type: smoke, load, stress, spike, soak | No | smoke |
| `base_url` | Base URL of the application to test | Yes | - |
| `k6_version` | k6 version to use | No | latest |
| `test_duration` | Override test duration (e.g., 5m, 1h) | No | Scenario default |
| `virtual_users` | Override number of virtual users | No | Scenario default |
| `thresholds_config` | Path to custom thresholds JSON | No | Built-in thresholds |
| `test_script` | Path to custom k6 test script | No | default-test.js |
| `fail_on_threshold` | Fail workflow if thresholds not met | No | true |
| `upload_results` | Upload results as artifacts | No | true |
| `cloud_run` | Run on k6 Cloud (requires token) | No | false |

### Test Scenarios

#### Smoke Test
- **Purpose**: Verify system works under minimal load
- **Duration**: 1 minute
- **VUs**: 1
- **Use case**: Post-deployment verification

#### Load Test
- **Purpose**: Test under normal expected load
- **Duration**: 9 minutes (ramp up, sustain, ramp down)
- **VUs**: 10 (configurable)
- **Use case**: Regular performance validation

#### Stress Test
- **Purpose**: Find breaking points
- **Duration**: 24 minutes with increasing load
- **VUs**: Up to 30
- **Use case**: Capacity planning

#### Spike Test
- **Purpose**: Test sudden traffic increases
- **Duration**: ~8 minutes with rapid changes
- **VUs**: 5 to 50 spike
- **Use case**: Flash sale or viral content scenarios

#### Soak Test
- **Purpose**: Extended duration testing
- **Duration**: 30 minutes (configurable)
- **VUs**: 10 constant
- **Use case**: Memory leak detection

### Authentication

For testing protected endpoints, provide custom headers:

```yaml
uses: ./.github/workflows/k6-load-test.yml
with:
  base_url: https://api.example.com
  test_scenario: load
secrets:
  CUSTOM_HEADERS: |
    {
      "Authorization": "Bearer ${{ secrets.API_TOKEN }}",
      "X-API-Key": "${{ secrets.API_KEY }}"
    }
```

### Custom Test Scripts

Create your own test script:

```javascript
// .github/k6/custom-api-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    api_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const response = http.post(
    `${__ENV.K6_BASE_URL}/api/endpoint`,
    JSON.stringify({ data: 'test' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(response, {
    'status is 201': (r) => r.status === 201,
  });
}
```

Then use it:

```yaml
uses: ./.github/workflows/k6-load-test.yml
with:
  test_script: .github/k6/custom-api-test.js
  base_url: https://api.example.com
```

### Threshold Configuration

Create custom thresholds:

```json
{
  "thresholds": {
    "http_req_failed": {
      "threshold": "rate<0.05",
      "abortOnFail": true
    },
    "http_req_duration": {
      "threshold": "p(99)<1000"
    }
  }
}
```

Use with:

```yaml
uses: ./.github/workflows/k6-load-test.yml
with:
  thresholds_config: .github/k6/thresholds/custom.json
```

### K6 Cloud Integration

For k6 Cloud runs:

1. Add your k6 Cloud token as a secret: `K6_CLOUD_TOKEN`
2. Enable cloud runs:

```yaml
uses: ./.github/workflows/k6-load-test.yml
with:
  cloud_run: true
  base_url: https://api.example.com
secrets:
  K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
```

## Best Practices

1. **Start with Smoke Tests**: Always run smoke tests first
2. **Gradual Load Increase**: Progress from smoke → load → stress
3. **Environment Isolation**: Don't run stress tests on production
4. **Monitor Resources**: Watch application metrics during tests
5. **Baseline Establishment**: Track performance over time
6. **Threshold Tuning**: Adjust based on your SLAs

## Troubleshooting

### Common Issues

1. **Base URL not accessible**
   - Ensure the deployment is complete
   - Check URL is publicly accessible or provide auth headers

2. **Threshold failures**
   - Review application performance
   - Adjust thresholds if needed
   - Check for resource constraints

3. **High error rates**
   - Verify endpoint paths
   - Check rate limiting
   - Review application logs

### Debugging

Enable debug output:

```yaml
env:
  K6_DEBUG: true
```

## Examples

See the [examples directory](./examples/) for complete integration patterns.

## Additional Documentation

- [Integration Guide](./INTEGRATION_GUIDE.md) - Patterns for integrating k6 into your CI/CD pipeline
- [Scenario Selection Guide](./SCENARIO_SELECTION_GUIDE.md) - How to choose the right test scenario
- [Browser Testing Note](./BROWSER_TESTING_NOTE.md) - Future plans for browser testing support

## Contributing

When adding new test scenarios:

1. Create the scenario in `scenarios/`
2. Update `default-test.js` with the new scenario
3. Document the scenario in this README
4. Add an example usage