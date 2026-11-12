/**
 * Maverick AI - Coding Assistant Service
 * DevOps, Cloud Infrastructure, Python, Bash, Terraform, and K8s Automation
 */

import { CodeAssistantSnippet } from '../types';

export class CodeAssistantService {
  /**
   * Preloaded production templates for rapid interview demonstration
   */
  getTemplates(): CodeAssistantSnippet[] {
    return [
      {
        id: 'code-k8s-pod-disruption',
        title: 'Kubernetes PodDisruptionBudget & Anti-Affinity Spec',
        language: 'kubernetes',
        code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: payment-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app.kubernetes.io/name: payment-service
  template:
    metadata:
      labels:
        app.kubernetes.io/name: payment-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/name
                  operator: In
                  values:
                  - payment-service
              topologyKey: topology.kubernetes.io/zone
      containers:
      - name: payment-service
        image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/payment:v2.1.4
        resources:
          requests:
            cpu: "250m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10`,
        explanation: 'Enforces zero-downtime cluster upgrades by guaranteeing at least 2 payment pods remain active during voluntary node drains (PDB). Employs soft PodAntiAffinity across availability zones to avoid single-AZ failure concentration.',
        executionSafety: 'safe',
        suggestedImprovements: [
          'Add liveness probe with appropriate initialDelaySeconds to avoid premature pod restarts',
          'Configure securityContext with readOnlyRootFilesystem: true and drop ALL capabilities',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'code-terraform-s3-backend',
        title: 'Terraform AWS S3 Encrypted Remote Backend with DynamoDB',
        language: 'terraform',
        code: `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "corp-infra-terraform-state-us-east-1"
    key            = "environments/prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}

# DynamoDB Locking Table Definition
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}`,
        explanation: 'Standard enterprise state management. Uses server-side encrypted S3 bucket with versioning and an AWS DynamoDB table with partition key LockID to prevent simultaneous pipeline state corruption.',
        executionSafety: 'safe',
        suggestedImprovements: [
          'Enable MFA Delete on the state bucket for ransomware protection',
          'Attach an IAM bucket policy denying non-TLS transport (aws:SecureTransport: false)',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'code-python-oom-analyzer',
        title: 'Python Script: Kubernetes Pod Memory & OOM Event Analyzer',
        language: 'python',
        code: `import subprocess
import json
import sys

def check_oom_pods(namespace="default"):
    """Queries Kubernetes API for pods terminated with exit code 137 (OOMKilled)."""
    cmd = [
        "kubectl", "get", "pods",
        "-n", namespace,
        "-o", "json"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error executing kubectl: {e.stderr}", file=sys.stderr)
        return []

    oom_incidents = []
    for item in data.get("items", []):
        pod_name = item["metadata"]["name"]
        statuses = item.get("status", {}).get("containerStatuses", [])
        
        for c in statuses:
            last_state = c.get("lastState", {}).get("terminated")
            if last_state and (last_state.get("exitCode") == 137 or last_state.get("reason") == "OOMKilled"):
                oom_incidents.append({
                    "pod": pod_name,
                    "container": c["name"],
                    "restart_count": c.get("restartCount", 0),
                    "finished_at": last_state.get("finishedAt"),
                    "reason": last_state.get("reason")
                })
    return oom_incidents

if __name__ == "__main__":
    ns = sys.argv[1] if len(sys.argv) > 1 else "production"
    print(f"Scanning namespace [{ns}] for OOMKilled events...")
    incidents = check_oom_pods(ns)
    if not incidents:
        print("✓ No OOMKilled pods detected in the current revision.")
    else:
        print(f"⚠ Detected {len(incidents)} OOMKilled events:")
        for inc in incidents:
            print(f"  - Pod: {inc['pod']} (Container: {inc['container']}) | Restarts: {inc['restart_count']}")`,
        explanation: 'Automates pod diagnosis by querying pod status JSON and isolating container termination state 137 or OOMKilled. Useful in live incident triage scripts.',
        executionSafety: 'safe',
        suggestedImprovements: [
          'Filter by pod start time to limit output to the last 60 minutes',
          'Integrate with Prometheus Alertmanager webhook for automatic diagnostic logging',
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Evaluate safety of any given code snippet
   */
  evaluateSafety(code: string): { safety: 'safe' | 'caution' | 'dangerous_mutation'; warning?: string } {
    const dangerousPatterns = [
      { pattern: /rm\s+-rf\s+[\/~]/i, warning: 'Detected dangerous file deletion command (rm -rf /)' },
      { pattern: /mkfs/i, warning: 'Detected filesystem formatting command (mkfs)' },
      { pattern: /kubectl\s+delete\s+(ns|namespace|node|all)/i, warning: 'Destructive Kubernetes cluster-wide deletion detected' },
      { pattern: /terraform\s+destroy/i, warning: 'Detected destructive Terraform destroy command which will tear down infrastructure' },
      { pattern: /drop\s+database/i, warning: 'Destructive SQL: DROP DATABASE command detected' },
      { pattern: /truncate\s+table/i, warning: 'Destructive SQL: TRUNCATE TABLE command detected' },
    ];

    for (const item of dangerousPatterns) {
      if (item.pattern.test(code)) {
        return { safety: 'dangerous_mutation', warning: item.warning };
      }
    }

    const cautionPatterns = [
      { pattern: /kill\s+-9/i, warning: 'Hard process kill signal detected (SIGKILL)' },
      { pattern: /iptables\s+-F/i, warning: 'Flushing firewall tables can lock down network access' },
      { pattern: /chmod\s+777/i, warning: 'Excessive open permissions (chmod 777) security risk' },
    ];

    for (const item of cautionPatterns) {
      if (item.pattern.test(code)) {
        return { safety: 'caution', warning: item.warning };
      }
    }

    return { safety: 'safe' };
  }
}

export const codeAssistantService = new CodeAssistantService();
