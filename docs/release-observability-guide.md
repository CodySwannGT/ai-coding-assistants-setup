# Release Observability Guide

## Overview

The Enhanced Release Workflow v3 introduces comprehensive observability features that provide complete visibility into the release pipeline. This guide explains how to use and interpret the observability data.

## Table of Contents

1. [Structured Logging](#structured-logging)
2. [Metrics Collection](#metrics-collection)
3. [Audit Trail](#audit-trail)
4. [Performance Monitoring](#performance-monitoring)
5. [Analytics Dashboard](#analytics-dashboard)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Structured Logging

### Log Format

All release events are logged in structured JSON format with the following schema:

```json
{
  "correlation_id": "rel-20250306120000-12345",
  "workflow_id": "12345",
  "event_type": "version_determination",
  "event_status": "success",
  "event_message": "Version determined successfully",
  "timestamp": "2025-03-06T12:00:00.000Z",
  "release": {
    "environment": "production",
    "version": "1.2.3",
    "tag": "v1.2.3"
  },
  "context": {
    "actor": "username",
    "repository": "org/repo",
    "ref": "refs/heads/main",
    "sha": "abc123..."
  }
}
```

### Event Types

The workflow logs the following event types:

| Event Type | Description | Status Values |
|------------|-------------|---------------|
| `release_workflow` | Overall workflow lifecycle | started, completed, failed |
| `version_determination` | Version calculation process | in_progress, success, failed |
| `version_conflict` | Version conflict detection | detected, resolved |
| `changelog_generation` | Changelog creation | started, completed, failed |
| `github_release` | GitHub release creation | started, success, failed |
| `metrics_collection` | Metrics gathering | completed |
| `performance_warning` | Slow operation detection | slow_operation |

### Accessing Logs

Logs are stored in multiple locations:

1. **Workflow Artifacts**: Download `release-events.jsonl` from the workflow run
2. **GitHub Actions Logs**: View in the Actions tab (when debug mode enabled)
3. **Combined Logs**: Available in the audit trail artifact

### Querying Logs

Example queries using `jq`:

```bash
# Find all failed events
jq 'select(.event_status == "failed")' release-events.jsonl

# Get version determination events
jq 'select(.event_type == "version_determination")' release-events.jsonl

# Find events for a specific correlation ID
jq 'select(.correlation_id == "rel-20250306120000-12345")' release-events.jsonl
```

## Metrics Collection

### Available Metrics

The workflow collects the following metrics:

| Metric | Description | Unit |
|--------|-------------|------|
| `version_creation.duration_seconds` | Time to determine version | seconds |
| `changelog_generation.duration_seconds` | Time to generate changelog | seconds |
| `release_creation.duration_seconds` | Time to create GitHub release | seconds |
| `version_conflicts.count` | Number of version conflicts | count |
| `git_operations.retry_count` | Number of git retries | count |
| `api_calls.retry_count` | Number of API retries | count |

### Metrics Format

Metrics are stored in `release-metrics.json`:

```json
{
  "correlation_id": "rel-20250306120000-12345",
  "timestamp": "2025-03-06T12:00:00Z",
  "version": "1.2.3",
  "environment": "production",
  "metrics": {
    "version_creation": {
      "duration_seconds": 5,
      "strategy": "semantic",
      "bump_type": "minor",
      "conflicts_encountered": 0
    },
    "changelog_generation": {
      "duration_seconds": 3,
      "generated": true
    },
    "quality_checks": {
      "result": "success",
      "skipped_jobs": ""
    }
  }
}
```

### Performance Baselines

Expected performance baselines:

- Version determination: < 5 seconds
- Changelog generation: < 10 seconds
- GitHub release creation: < 15 seconds
- Total workflow: < 5 minutes

## Audit Trail

### Audit Record Structure

Each release generates a comprehensive audit record:

```json
{
  "audit_version": "1.0",
  "release_id": "12345",
  "correlation_id": "rel-20250306120000-12345",
  "timestamp": "2025-03-06T12:00:00Z",
  "release_info": {
    "version": "1.2.3",
    "tag": "v1.2.3",
    "environment": "production",
    "strategy": "semantic",
    "prerelease": false
  },
  "workflow_inputs": {
    "skip_jobs": "",
    "force_release": false,
    "release_notes_template": "default"
  },
  "execution_context": {
    "actor": "username",
    "event": "workflow_dispatch",
    "repository": "org/repo",
    "ref": "refs/heads/main",
    "sha": "abc123...",
    "workflow": "Enhanced Release Workflow v3",
    "run_id": "12345",
    "run_number": "100",
    "run_attempt": "1"
  },
  "job_results": {
    "quality": {
      "status": "success",
      "conclusion": "success"
    },
    "version": {
      "status": "success",
      "conclusion": "success",
      "outputs": {
        "version": "1.2.3",
        "bump_type": "minor",
        "changelog_generated": "true"
      }
    },
    "github_release": {
      "status": "success",
      "conclusion": "success",
      "outputs": {
        "release_url": "https://github.com/org/repo/releases/tag/v1.2.3",
        "release_id": "123456789"
      }
    }
  },
  "timing": {
    "start_time": "1709726400",
    "end_time": "1709726700",
    "total_duration_seconds": 300
  }
}
```

### Audit Trail Features

1. **Tamper-Proof**: Optional digital signatures using `AUDIT_SIGNING_KEY`
2. **Compliance Ready**: 365-day retention for audit records
3. **Complete History**: Every release decision tracked
4. **Verification**: Signature verification for integrity

### Accessing Audit Records

```bash
# Download audit trail artifact
gh run download <run-id> -n release-audit-trail-<run-id>

# Verify signature (if signing enabled)
openssl dgst -sha256 -verify public.key -signature release-audit-*.json.sig release-audit-*.json
```

## Performance Monitoring

### Performance Tracking

The workflow tracks performance for all major operations:

```csv
operation_name|duration|exit_code
standard_version_bump|2.5|0
git_pull_rebase|1.2|0
changelog_generation|3.8|0
github_api_release|5.1|0
```

### Performance Warnings

Operations exceeding thresholds trigger warnings:

- Version operations > 5 seconds
- Changelog generation > 10 seconds
- API calls > 15 seconds

### Performance Analysis

View performance report in workflow artifacts:

```markdown
# Release Performance Report

## Operation Timings

| Operation | Duration (s) | Status |
|-----------|-------------|---------|
| standard_version_bump | 2.50 | ✅ |
| git_pull_rebase | 1.20 | ✅ |
| changelog_generation | 3.80 | ✅ |

**Total Duration**: 7.50s
```

## Analytics Dashboard

### Analytics Report Contents

The analytics report provides:

1. **Release Summary**
   - Version, environment, status
   - Total duration
   - Correlation ID

2. **Performance Analysis**
   - Job timings breakdown
   - Bottleneck identification
   - Optimization opportunities

3. **Quality Metrics**
   - Test results
   - Security scan status
   - Quality gate outcomes

4. **Event Statistics**
   - Total events logged
   - Error event count
   - Warning event count

5. **Recommendations**
   - Process improvements
   - Performance optimizations
   - Best practice suggestions

### Dashboard Access

1. **GitHub Summary**: View in workflow run summary
2. **Artifacts**: Download `release-analytics-<run-id>`
3. **External Platform**: Push to metrics platform (if configured)

## Troubleshooting

### Common Issues

1. **Missing Logs**
   - Check if logger initialization succeeded
   - Verify artifact upload completed
   - Ensure proper permissions

2. **Incomplete Metrics**
   - Check for job failures
   - Verify timing variables set
   - Review performance-metrics.csv

3. **Audit Trail Gaps**
   - Ensure all jobs completed
   - Check artifact retention settings
   - Verify JSON formatting

### Debug Mode

Enable debug mode for verbose logging:

```yaml
- uses: org/repo/.github/workflows/release.yml@main
  with:
    debug: true
```

### Log Analysis Commands

```bash
# Count events by type
jq -r '.event_type' release-events.jsonl | sort | uniq -c

# Find slow operations
jq 'select(.event_type == "performance_warning")' release-events.jsonl

# Get timeline of events
jq -r '[.timestamp, .event_type, .event_status] | @tsv' release-events.jsonl | sort

# Extract errors
jq 'select(.event_status == "failed")' release-events.jsonl
```

## Best Practices

### 1. Correlation IDs

Always use correlation IDs to track related events:

```bash
# Filter all events for a release
CORRELATION_ID="rel-20250306120000-12345"
jq --arg id "$CORRELATION_ID" 'select(.correlation_id == $id)' release-events.jsonl
```

### 2. Metrics Platform Integration

Configure metrics platform for centralized monitoring:

```yaml
env:
  METRICS_API_KEY: ${{ secrets.METRICS_API_KEY }}
  METRICS_ENDPOINT: ${{ secrets.METRICS_ENDPOINT }}
```

### 3. Retention Policies

- Audit trails: 365 days (compliance)
- Event logs: 90 days (troubleshooting)
- Performance data: 90 days (analysis)
- Analytics reports: 90 days (insights)

### 4. Monitoring Alerts

Set up alerts for:

- Failed releases
- Performance degradation
- Version conflicts
- Quality check failures

### 5. Regular Reviews

Schedule periodic reviews of:

- Release frequency trends
- Performance baselines
- Error patterns
- Process improvements

## Integration Examples

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Release Pipeline Metrics",
    "panels": [
      {
        "title": "Release Success Rate",
        "query": "sum(release_status{result='success'}) / sum(release_status)"
      },
      {
        "title": "Average Release Duration",
        "query": "avg(release_duration_seconds)"
      },
      {
        "title": "Version Conflicts",
        "query": "sum(version_conflicts_total)"
      }
    ]
  }
}
```

### Datadog Integration

```yaml
- name: Send to Datadog
  env:
    DD_API_KEY: ${{ secrets.DD_API_KEY }}
  run: |
    # Send custom metrics
    currenttime=$(date +%s)
    curl -X POST "https://api.datadoghq.com/api/v1/series" \
      -H "DD-API-KEY: $DD_API_KEY" \
      -H "Content-Type: application/json" \
      -d @- << EOF
    {
      "series": [
        {
          "metric": "release.duration",
          "points": [[$currenttime, $TOTAL_DURATION]],
          "tags": ["env:${{ inputs.environment }}", "version:$VERSION"]
        }
      ]
    }
    EOF
```

### Splunk Integration

```bash
# Send events to Splunk
curl -k https://splunk.example.com:8088/services/collector/event \
  -H "Authorization: Splunk ${{ secrets.SPLUNK_TOKEN }}" \
  -d @release-events.jsonl
```

## Summary

The Release Observability features provide:

- **Complete Visibility**: Every release event tracked and logged
- **Performance Insights**: Identify bottlenecks and optimization opportunities
- **Compliance Ready**: Comprehensive audit trail with optional signatures
- **Actionable Analytics**: Data-driven insights for process improvement
- **Integration Ready**: Works with popular monitoring platforms

Use these features to maintain high-quality, efficient release processes with full transparency and accountability.