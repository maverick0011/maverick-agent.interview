import { ResumeProfile, KnowledgeDocument, InterviewSession, AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaEndpoint: 'http://127.0.0.1:3001/ollama',
  primaryModel: 'qwen3:8b-q4_K_M',
  contextLength: 8192,
  temperature: 0.35,
  maxOutputTokens: 1024,
  whisperModel: 'base',
  selectedMicId: 'default',
  systemAudioCaptureEnabled: true,
  screenSharePrivacyEnabled: true,
  floatingOpacity: 0.95,
  defaultAnswerMode: 'senior',
  theme: 'dark',
  telemetryEnabled: false,
  soundAlertsEnabled: true,
  shortcuts: {
    toggleFloating: 'CommandOrControl+Shift+Space',
    quickAskAI: 'CommandOrControl+Shift+A',
    pauseResumeCapture: 'CommandOrControl+Shift+P',
    clearTranscript: 'CommandOrControl+Shift+X',
  },
};

export const INITIAL_RESUME: ResumeProfile = {
  id: 'resume-01',
  candidateName: 'Alex Mercer',
  targetRole: 'Staff Site Reliability & DevOps Engineer',
  yearsOfExperience: 8,
  summary: 'Staff Infrastructure & Reliability Engineer specializing in Kubernetes orchestration, multi-cloud AWS automation, zero-downtime distributed systems, and Terraform enterprise modules. Proven record reducing MTTR by 64% and driving 99.99% service availability across 80+ microservices.',
  skills: [
    {
      category: 'Cloud & Infrastructure',
      items: ['AWS (EKS, VPC, Route53, ALB, IAM, S3, CloudWatch)', 'GCP', 'Bare-Metal Linux (Ubuntu, RHEL)'],
    },
    {
      category: 'Containers & Orchestration',
      items: ['Kubernetes', 'Docker', 'Helm', 'ArgoCD', 'Istio Service Mesh', 'Cilium eBPF'],
    },
    {
      category: 'Infrastructure as Code',
      items: ['Terraform', 'Terragrunt', 'Ansible', 'Pulumi', 'Packer'],
    },
    {
      category: 'Observability & SRE',
      items: ['Prometheus', 'Grafana', 'Thanos', 'OpenTelemetry', 'Datadog', 'SLI/SLO Engineering', 'PagerDuty'],
    },
    {
      category: 'Languages & Automation',
      items: ['Python', 'Go', 'Bash', 'YAML/JSON', 'SQL', 'GitHub Actions', 'Jenkins Scripted Pipelines'],
    },
  ],
  experience: [
    {
      id: 'exp-1',
      company: 'Aether Cloud Systems',
      role: 'Staff SRE & Platform Architect',
      duration: '2022 — Present',
      highlights: [
        'Architected 14 multi-tenant Amazon EKS clusters across 3 regions serving 45,000 QPS with automated Karpenter node autoscaling, cutting compute spend by $280K/year.',
        'Engineered zero-trust service mesh with Istio mTLS and SPIFFE/SPIRE identity management, achieving SOC2 Type II compliance.',
        'Formulated enterprise error-budget policy and automated canary deployments using Argo Rollouts, dropping production rollback rates from 7.2% to 0.4%.',
      ],
    },
    {
      id: 'exp-2',
      company: 'DataStream Global',
      role: 'Senior DevOps / Cloud Automation Engineer',
      duration: '2019 — 2022',
      highlights: [
        'Built enterprise Terraform modules with remote S3 backend and DynamoDB distributed state locking for 120+ software engineers.',
        'Led critical incident triage for major AWS us-east-1 outage, successfully redirecting 100% traffic to us-west-2 via Route53 Latency-based failover within 4 minutes.',
        'Designed Prometheus federated metrics stack with Thanos long-term storage handling 2.5 million metrics/second.',
      ],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Automated Chaos Testing & K8s Outage Simulator',
      description: 'Built an internal chaos testing tool utilizing Chaos Mesh and custom Go operators to inject pod kills, network latency, and DNS partition events into staging clusters.',
      technologies: ['Go', 'Kubernetes', 'Chaos Mesh', 'Prometheus'],
      metrics: 'Discovered 11 cascading failure modes prior to Black Friday traffic surge.',
    },
    {
      id: 'proj-2',
      name: 'GitOps Continuous Delivery Pipeline with Cosign Signing',
      description: 'End-to-end GitHub Actions and ArgoCD pipeline enforcing cryptographic container image signing and Kyverno policy admission controller verification.',
      technologies: ['GitHub Actions', 'ArgoCD', 'Cosign', 'Kyverno', 'Helm'],
      metrics: 'Decreased deployment lead time from 4 hours to 11 minutes with 100% supply-chain traceability.',
    },
  ],
  uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
};

export const INITIAL_KNOWLEDGE_DOCS: KnowledgeDocument[] = [
  {
    id: 'doc-01',
    title: 'Incident Runbook: Kubernetes CrashLoopBackOff & OOMKilled Triage',
    category: 'runbook',
    chunksCount: 4,
    sizeBytes: 4280,
    lastIndexed: new Date().toISOString(),
    summary: 'Standard operating procedure for isolating container termination codes 137 (OOMKilled) vs 1 (Application Error) and diagnosing probe misconfigurations.',
    content: `
# Kubernetes CrashLoopBackOff & OOMKilled Runbook

## Diagnosis Workflow:
1. Identify Termination Reason:
   Run: kubectl describe pod <pod-name> -n <namespace>
   Inspect the 'Last State' section:
   - If 'Exit Code: 137' and 'Reason: OOMKilled': The container exceeded its cgroup memory limit or kernel invocation of OOM killer occurred.
   - If 'Exit Code: 1' or '255': Application unhandled exception, syntax error, or missing configuration secret.

2. Verify Container Logs:
   Run: kubectl logs <pod-name> -c <container> --previous
   Inspect crash logs immediately preceding exit. Check stack traces, database connectivity timeouts, or unhandled promise rejections.

3. Health Check Probes:
   - Check if livenessProbe failure killed the pod. If livenessProbe uses an expensive HTTP endpoint that timed out during CPU throttle, adjust initialDelaySeconds or timeoutSeconds.
   - Decouple livenessProbe (pod restart) from readinessProbe (traffic routing).

4. Memory Limit Mitigation:
   - Check Prometheus container_memory_working_set_bytes vs kube_pod_container_resource_limits.
   - Increase memory limit or tune JVM heap (-XX:MaxRAMPercentage=75.0) to avoid container cgroup clash.
    `,
  },
  {
    id: 'doc-02',
    title: 'Architecture Blueprint: High-Availability AWS Multi-Region EKS',
    category: 'architecture',
    chunksCount: 5,
    sizeBytes: 5890,
    lastIndexed: new Date().toISOString(),
    summary: 'Design specifications for Active-Active multi-region deployment across us-east-1 and us-west-2 using Route53 ARC, Global Accelerator, and Aurora Global Database.',
    content: `
# High-Availability AWS Multi-Region Deployment Architecture

## Key Components:
- Traffic Ingress: Route 53 Application Recovery Controller (ARC) with health routing checks, alongside AWS Global Accelerator providing dual Anycast static IP addresses.
- Compute Layer: Amazon EKS clusters deployed across 3 Availability Zones in primary (us-east-1) and secondary (us-west-2) regions.
- Data Storage: Amazon Aurora PostgreSQL Global Database with storage-level replication (typical cross-region latency < 1 second). Read replicas available locally in both regions; write master in primary.
- Cluster Ingress: AWS Application Load Balancer (ALB) via AWS Load Balancer Controller terminating TLS 1.3 with ACM wildcard certificates.
- Autoscaling: Karpenter controller for node provisioning responding to unschedulable pod events within 45 seconds, mixed with Spot and On-Demand instances.
    `,
  },
  {
    id: 'doc-03',
    title: 'Production Guide: Terraform State Locking and Enterprise Concurrency',
    category: 'runbook',
    chunksCount: 3,
    sizeBytes: 3120,
    lastIndexed: new Date().toISOString(),
    summary: 'Best practices for S3 remote state backends with DynamoDB LockID, state corruption prevention, and blast radius partitioning.',
    content: `
# Terraform State Locking & Blast Radius Partitioning

## S3 Backend Configuration:
- Use remote state in an encrypted S3 bucket with versioning enabled and MFA Delete.
- Mandatory DynamoDB table with partition key 'LockID' (String) to prevent concurrent state manipulations.

## Blast Radius Discipline:
- Avoid monolithic state files containing VPC, RDS, and EKS simultaneously.
- Partition state into layers:
  1. 01-networking (VPC, Subnets, NAT Gateways - changes rarely)
  2. 02-security (IAM roles, Security Groups)
  3. 03-compute (EKS clusters, nodegroups)
  4. 04-workloads (ArgoCD, Ingress controllers)
- If a state lock becomes stuck due to pipeline timeout:
  Verify no active agent process is executing, then run: terraform force-unlock <LOCK-ID>.
    `,
  },
];

export const INITIAL_SESSIONS: InterviewSession[] = [
  {
    id: 'session-demo-01',
    title: 'Staff SRE Architecture & System Resilience',
    role: 'Staff SRE Engineer',
    company: 'Stripe / Cloud Platforms',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    durationSeconds: 1420,
    transcripts: [
      {
        id: 'ts-1',
        channel: 'interviewer',
        text: 'Can you walk us through how you would handle a sudden HTTP 503 spike across multiple microservices during peak traffic?',
        timestamp: '00:04:12',
        confidence: 0.98,
        isQuestion: true,
        detectedTopics: ['Incident Response', 'HTTP 503', 'Microservices', 'Load Balancing'],
      },
      {
        id: 'ts-2',
        channel: 'candidate',
        text: 'First, I classify whether the 503 is generated by our ingress load balancers or the upstream services. If ALB returns 503, it means targets are failing health checks or target group capacity is exhausted.',
        timestamp: '00:04:45',
        confidence: 0.97,
        isQuestion: false,
      },
      {
        id: 'ts-3',
        channel: 'interviewer',
        text: 'Good distinction. Suppose the upstream pods are returning 503 due to database connection pool exhaustion. How do you resolve this under pressure?',
        timestamp: '00:05:30',
        confidence: 0.99,
        isQuestion: true,
        detectedTopics: ['Database Pooling', 'Connection Starvation', 'PgBouncer', 'Circuit Breaking'],
      },
    ],
    responses: [
      {
        id: 'resp-1',
        sessionId: 'session-demo-01',
        questionText: 'Suppose the upstream pods are returning 503 due to database connection pool exhaustion. How do you resolve this under pressure?',
        answerText: `Immediate Triage & Mitigation:
1. Stop the Bleeding: Enable aggressive client-side circuit breaking in Envoy / Istio so failed queries fail fast rather than compounding queue depth.
2. Connection Pooling Proxy: Verify whether PgBouncer / RDS Proxy is deployed between pods and the database. If pods connect directly to PostgreSQL, each pod spawn consumes connection memory.
3. Temporary Query Throttling: Rate limit non-critical background batch jobs and non-essential endpoints at the API gateway layer to free connections for transactional workflows.
4. Scale Read Traffic: Route read-only queries to Aurora read replicas via reader endpoint.
5. Post-Incident Root Cause: Implement connection pool ceilings (e.g. HikariCP maxPoolSize = 10-15 per pod) and horizontal autoscaling based on queue latency rather than purely CPU.`,
        mode: 'senior',
        category: 'sre',
        timestamp: '00:05:32',
        latencyMs: 380,
        groundedSources: [
          {
            documentId: 'doc-02',
            documentTitle: 'AWS Multi-Region EKS Blueprint',
            snippet: 'Amazon Aurora PostgreSQL Global Database with read replicas available locally.',
            relevance: 0.94,
          },
        ],
      },
    ],
    summary: 'Candidate demonstrated deep production triage skills, correctly isolating ingress vs upstream errors, recommending database proxy layers (PgBouncer/RDS Proxy), and circuit breaking.',
    actionItems: [
      'Document PgBouncer connection ceilings in runbook',
      'Review Aurora read-replica connection distribution',
    ],
    keyTopics: ['HTTP 503', 'Database Connection Exhaustion', 'Istio Circuit Breakers', 'RDS Proxy'],
  },
];
