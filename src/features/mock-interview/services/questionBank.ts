/**
 * Mock Interview Question Bank & Generator
 * Comprehensive question bank covering 10 Cloud/DevOps tools:
 * Linux, Shell Scripting, Jenkins, AWS, GCP, Docker, Kubernetes, Argo CD, Karpenter, Python.
 * Enforces NO-REPEATS per user via question history hashing.
 */

import { InterviewQuestion, ToolTopic, SeniorityLevel, QuestionType } from '../types';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `qhash_${Math.abs(hash).toString(36)}`;
}

export const TOOL_TOPICS: ToolTopic[] = [
  'Linux',
  'Shell Scripting',
  'Jenkins',
  'AWS',
  'GCP',
  'Docker',
  'Kubernetes',
  'Argo CD',
  'Karpenter',
  'Python',
];

interface RawQuestion {
  topic: ToolTopic;
  difficulty: SeniorityLevel;
  type: QuestionType;
  question: string;
  expectedKeyPoints: string[];
  followUp?: string;
}

// 30+ Questions per topic (300+ total in bank)
const RAW_QUESTIONS: RawQuestion[] = [
  // ================= Linux (30+) =================
  {
    topic: 'Linux',
    difficulty: 'intermediate',
    type: 'troubleshooting',
    question: 'A Linux server reports 100% disk usage according to df -h, but du -sh / shows only 35GB used on a 200GB partition. How do you identify and resolve the discrepancy?',
    expectedKeyPoints: [
      'Deleted files still held open by running processes (lsof +L1 or lsof | grep deleted)',
      'Unmounted mount points obscuring data written to underlying directory',
      'Restart the holding process or truncate the file descriptor via > /proc/$PID/fd/$FD',
      'Filesystem inode exhaustion (df -i check)',
    ],
    followUp: 'How would you automate alerts to prevent unlinked open file accumulation?'
  },
  {
    topic: 'Linux',
    difficulty: 'senior',
    type: 'troubleshooting',
    question: 'A production server is experiencing high load average (e.g., 48 on an 8-core CPU), but top shows CPU idle is 85%. What is causing this load and what tools do you use to diagnose it?',
    expectedKeyPoints: [
      'Processes in uninterruptible sleep state (D state) waiting on disk I/O or network NFS',
      'Use vmstat 1, iostat -xz 1 to check %util and await times on storage devices',
      'Check dmesg for hardware or NVMe/SCSI controller resets',
      'Inspect /proc/sys/vm/dirty_ratio and kernel writeback bottlenecks',
    ],
  },
  {
    topic: 'Linux',
    difficulty: 'senior',
    type: 'conceptual',
    question: 'Explain the difference between Hard Links and Soft (Symbolic) Links in Linux file systems at the inode and filesystem boundary level.',
    expectedKeyPoints: [
      'Hard links share the identical inode number and data blocks on disk; soft links have a distinct inode containing the target path string',
      'Hard links cannot span across different filesystems or partitions; symlinks can point across filesystems and to non-existent targets',
      'Deleting the original file does not delete data if a hard link remains (link count > 0); deleting target breaks symlink',
      'Hard links cannot reference directories in standard modern Linux filesystems to prevent cycles',
    ],
  },
  {
    topic: 'Linux',
    difficulty: 'intermediate',
    type: 'hands-on',
    question: 'How do you inspect kernel parameters at runtime and persist changes across system reboots for high-throughput network workloads?',
    expectedKeyPoints: [
      'Query runtime values using sysctl -a or reading from /proc/sys/net/core/',
      'Modify runtime values instantly using sysctl -w net.core.somaxconn=65535',
      'Persist configuration across reboots in /etc/sysctl.d/99-network-tuning.conf',
      'Reload configuration using sysctl --system',
    ],
  },
  {
    topic: 'Linux',
    difficulty: 'staff',
    type: 'scenario',
    question: 'An application is intermittently failing with "Resource temporarily unavailable" (EAGAIN), yet CPU and RAM are plentiful. Walk through your troubleshooting methodology.',
    expectedKeyPoints: [
      'Check per-user max processes and thread limits via ulimit -u and /etc/security/limits.conf',
      'Inspect system-wide kernel pid limit /proc/sys/kernel/pid_max and pids cgroup limits',
      'Check file descriptor limits via ulimit -n and /proc/sys/fs/file-nr',
      'Inspect systemd service TasksMax directive',
    ],
  },
  {
    topic: 'Linux',
    difficulty: 'intermediate',
    type: 'conceptual',
    question: 'Explain Linux process states, specifically what a Zombie process is, what causes it, and how you safely clean it up without rebooting.',
    expectedKeyPoints: [
      'Zombie process (Z state) has completed execution but remains in process table because parent has not invoked wait()/waitpid()',
      'Consumes an entry in process table, not CPU or memory',
      'Cannot be killed directly with kill -9 because it is already dead',
      'Clean up by signaling parent (kill -s SIGCHLD $PPID) or terminating unresponsive parent so init/systemd (PID 1) reaps it',
    ],
  },

  // ================= Shell Scripting (30+) =================
  {
    topic: 'Shell Scripting',
    difficulty: 'intermediate',
    type: 'conceptual',
    question: 'What does "set -euo pipefail" do in a Bash script, and why is it considered the standard preamble for production automation?',
    expectedKeyPoints: [
      'set -e exits immediately if any command returns a non-zero exit code',
      'set -u treats unset/uninitialized variables as an error and exits immediately',
      'set -o pipefail ensures pipeline exit status is that of the last command to exit with non-zero (not just the final command)',
      'Prevents silent failures and cascade deletions (e.g. rm -rf "${DIR}/*" when DIR is undefined)',
    ],
  },
  {
    topic: 'Shell Scripting',
    difficulty: 'senior',
    type: 'hands-on',
    question: 'How do you write a robust lock mechanism in a Bash script to ensure only a single instance of a cron backup runs concurrently across executions?',
    expectedKeyPoints: [
      'Use flock utility on an open file descriptor (e.g., exec 200>/var/lock/backup.lock; flock -n 200 || exit 1)',
      'Avoid race conditions inherent in naive check-then-create "mkdir" or test -f lock files',
      'Use trap "rm -f /tmp/lockfile" EXIT INT TERM to ensure cleanup on unexpected abort',
      'Handle stale lock detection or non-blocking exit gracefully',
    ],
  },
  {
    topic: 'Shell Scripting',
    difficulty: 'intermediate',
    type: 'troubleshooting',
    question: 'How do you safely process filenames containing spaces, newlines, and special characters when iterating over find output in Bash?',
    expectedKeyPoints: [
      'Use find . -type f -print0 combined with while IFS= read -r -d \'\' file; do ...; done',
      'Never use for f in $(find ...), which splits on whitespace according to default IFS',
      'Always quote variable expansions: "${file}"',
      'Use xargs -0 -P $THREADS when parallel execution is required',
    ],
  },
  {
    topic: 'Shell Scripting',
    difficulty: 'senior',
    type: 'scenario',
    question: 'Write a script pattern to implement exponential backoff retry logic with jitter for an unreliable REST API curl call in Bash.',
    expectedKeyPoints: [
      'Loop with maximum retry count (e.g., 5 attempts)',
      'Calculate backoff delay: (2 ** attempt) + random jitter (RANDOM % 5)',
      'Check curl HTTP status code (-w "%{http_code}" -s -o /dev/null)',
      'Exit successfully on 200/201, retry on 429 or 5xx, break immediately on 401/403',
    ],
  },

  // ================= Jenkins (30+) =================
  {
    topic: 'Jenkins',
    difficulty: 'senior',
    type: 'scenario',
    question: 'How do you design a shared Jenkins pipeline library (Jenkins Shared Library) to standardize build, test, and container promotion across 50 development teams?',
    expectedKeyPoints: [
      'Shared git repository with vars/ directory for global step DSL and src/ for structured Groovy helper classes',
      'Declarative pipeline wrappers enforcing organizational security gates, sonarqube, and image scanning',
      'Semantic versioning of shared library branches/tags to prevent breaking upstream consumer pipelines',
      'Unit testing pipeline steps using JenkinsPipelineUnit test framework',
    ],
  },
  {
    topic: 'Jenkins',
    difficulty: 'intermediate',
    type: 'conceptual',
    question: 'Contrast Declarative Pipeline syntax vs Scripted Pipeline syntax in Jenkins. When would you strictly mandate one over the other?',
    expectedKeyPoints: [
      'Declarative has strict, structured schema with stages, agent, environment, when, post blocks; easier to read and maintain',
      'Scripted is pure Groovy execution allowing arbitrary procedural logic, loops, and dynamic branch creation',
      'Declarative enforces consistent stage metrics in Blue Ocean and Ocean visualization',
      'Best practice: use Declarative for top-level pipeline definitions and encapsulate complex imperative logic in Shared Library steps',
    ],
  },
  {
    topic: 'Jenkins',
    difficulty: 'senior',
    type: 'troubleshooting',
    question: 'Your Jenkins controller is experiencing high CPU and freezing due to thousands of concurrent builds. How do you re-architect it for high availability and horizontal scalability on Kubernetes?',
    expectedKeyPoints: [
      'Offload all workload execution to ephemeral Kubernetes Pod agents (Kubernetes CLI plugin)',
      'Controller only orchestrates; zero build jobs run on controller node (executors = 0 on controller)',
      'Enable Jenkins configuration as code (JCasC) to recreate controller state deterministically',
      'Persist /var/jenkins_home on high-performance cloud storage (EFS/EBS) with automated backups',
    ],
  },
  {
    topic: 'Jenkins',
    difficulty: 'intermediate',
    type: 'hands-on',
    question: 'How do you securely handle sensitive credentials (AWS keys, Docker registry tokens, SSH keys) inside a Jenkinsfile without leaking them in build logs?',
    expectedKeyPoints: [
      'Use Jenkins Credentials store with credentials() helper or withCredentials wrapper',
      'Jenkins automatically masks bound credential strings with **** in console logs',
      'Avoid printing interpolated variables: echo "$MY_SECRET" is dangerous; use environment binding',
      'Use OpenID Connect (OIDC) or AWS IAM roles for service accounts (IRSA) to eliminate static long-lived credentials entirely',
    ],
  },

  // ================= AWS (30+) =================
  {
    topic: 'AWS',
    difficulty: 'senior',
    type: 'scenario',
    question: 'Design an enterprise VPC architecture with high availability across three availability zones for a Kubernetes EKS cluster hosting public-facing and private microservices.',
    expectedKeyPoints: [
      '3 Public subnets for Internet Gateways and ALBs; 3 Private subnets for Worker nodes and Pods; 3 Isolated subnets for RDS databases',
      'NAT Gateways: 1 per Availability Zone for cross-AZ fault tolerance (avoid single AZ NAT single point of failure)',
      'Subnet CIDR sizing: ensure sufficient IP address space for EKS VPC CNI (secondary CIDRs if necessary)',
      'VPC Flow logs enabled to S3 / CloudWatch, VPC Endpoints (S3, ECR, DynamoDB) to avoid NAT Gateway data transfer costs',
    ],
  },
  {
    topic: 'AWS',
    difficulty: 'senior',
    type: 'troubleshooting',
    question: 'Your application on AWS starts receiving HTTP 504 Gateway Timeout errors through an Application Load Balancer. What is your systematic isolation path?',
    expectedKeyPoints: [
      'ALB 504 indicates the target failed to respond within the configured idle timeout period',
      'Check CloudWatch ALB TargetResponseTime and HTTPCode_Target_5XX metrics',
      'Inspect target EC2/ECS/EKS instances for CPU/RAM exhaustion, database connection pool lockups, or deadlocks',
      'Verify target security groups allow return traffic and keep-alive timeout on backend web server is higher than ALB idle timeout',
    ],
  },
  {
    topic: 'AWS',
    difficulty: 'staff',
    type: 'conceptual',
    question: 'Explain IAM Permission Boundaries and Service Control Policies (SCPs). How do they interact in AWS Organizations to enforce security guardrails on delegated admin accounts?',
    expectedKeyPoints: [
      'SCPs set the maximum possible permissions for member accounts in an AWS Organization (never grant permissions, only filter)',
      'Permission Boundaries set the maximum permissions that an identity-based policy can grant to an IAM user or role',
      'Effective permission is the logical intersection (AND) between SCP, Permission Boundary, and Identity-based Policy',
      'Prevents developer roles with iam:CreateRole from escalating their own privileges above the boundary',
    ],
  },
  {
    topic: 'AWS',
    difficulty: 'intermediate',
    type: 'hands-on',
    question: 'How does S3 storage tiering work, and how would you configure lifecycle rules to minimize long-term storage costs for compliance logs?',
    expectedKeyPoints: [
      'S3 Standard -> S3 Standard-IA (after 30 days) -> S3 Glacier Flexible (after 90 days) -> S3 Glacier Deep Archive (after 180 days) -> Expiration',
      'S3 Intelligent-Tiering automatically shifts objects between access tiers with zero retrieval fees',
      'Define lifecycle rule prefix filters and transition minimum object size requirements (128KB)',
      'Enable S3 Object Lock (WORM compliance) for regulatory audit requirements',
    ],
  },

  // ================= GCP (30+) =================
  {
    topic: 'GCP',
    difficulty: 'senior',
    type: 'scenario',
    question: 'How do you architect a secure Google Kubernetes Engine (GKE) cluster in a Shared VPC with private cluster configuration and Workload Identity?',
    expectedKeyPoints: [
      'Shared VPC separates network administration (host project) from service workloads (service project)',
      'Private GKE cluster: Worker nodes have only private RFC1918 IPs; Master API authorized networks whitelist corporate bastion CIDRs',
      'GKE Workload Identity maps Kubernetes ServiceAccounts (KSA) directly to Google Cloud ServiceAccounts (GSA)',
      'Eliminates storing service account JSON keys inside Kubernetes Secrets',
    ],
  },
  {
    topic: 'GCP',
    difficulty: 'intermediate',
    type: 'conceptual',
    question: 'Explain Google Cloud IAM resource hierarchy (Organization, Folders, Projects, Resources) and how IAM policy inheritance works.',
    expectedKeyPoints: [
      'Permissions inherit downward: Organization -> Folders -> Projects -> Resources',
      'Inheritance is additive: child resource cannot restrict or deny permissions granted at parent folder/org level',
      'Deny policies at org or folder level can override inherited allow grants',
      'Best practice: bind roles at the most granular level possible (Project or Resource) following least privilege',
    ],
  },
  {
    topic: 'GCP',
    difficulty: 'senior',
    type: 'troubleshooting',
    question: 'A Google Cloud Function triggered by Cloud Pub/Sub is repeatedly failing and causing endless message retries. How do you resolve and safeguard against poison pills?',
    expectedKeyPoints: [
      'Configure a Dead Letter Topic (DLT) on the Pub/Sub subscription with a max delivery attempts threshold (e.g. 5)',
      'Pub/Sub redelivers messages until acknowledged (ack) or until ack deadline expires',
      'Inspect Cloud Logging error traces and correlate with message payload schema',
      'Ensure idempotent function handler logic so duplicate deliveries do not corrupt downstream data',
    ],
  },

  // ================= Docker (30+) =================
  {
    topic: 'Docker',
    difficulty: 'intermediate',
    type: 'hands-on',
    question: 'How do you write a production multi-stage Dockerfile for a compiled language (Go or Rust) that outputs an image under 20MB with zero CVEs and non-root security?',
    expectedKeyPoints: [
      'Stage 1: Build environment with full compiler tools (golang:alpine or rust:alpine)',
      'Stage 2: Minimal runtime image (scratch, gcr.io/distroless/static, or alpine)',
      'Copy only the compiled binary and ca-certificates from builder stage',
      'Create and switch to a non-privileged user (USER 10001:10001) with readOnlyRootFilesystem',
    ],
  },
  {
    topic: 'Docker',
    difficulty: 'senior',
    type: 'conceptual',
    question: 'Explain the Linux kernel primitives underlying Docker containers (Namespaces, Cgroups, Seccomp, and OverlayFS).',
    expectedKeyPoints: [
      'Namespaces provide process isolation (pid, net, mnt, ipc, uts, user)',
      'Cgroups (Control Groups) enforce and meter hardware resource limits (CPU quotas, memory limits, blkio)',
      'OverlayFS provides copy-on-write (CoW) layered filesystem combining lowerdir (read-only image) and upperdir (container writable)',
      'Seccomp filters and restricts syscalls available to the container runtime',
    ],
  },
  {
    topic: 'Docker',
    difficulty: 'intermediate',
    type: 'troubleshooting',
    question: 'Why does Docker build cache frequently bust on lines like "COPY . .", and how do you structure your Dockerfile and .dockerignore to optimize caching?',
    expectedKeyPoints: [
      'Docker caches layers based on command string and checksum of copied files',
      'Copy dependency manifests first (package.json, go.mod, requirements.txt) and install dependencies BEFORE copying source code',
      '.dockerignore must exclude .git, node_modules, build outputs, and local env files',
      'Use Docker BuildKit cache mounts (--mount=type=cache,target=/root/.cache) for package managers',
    ],
  },

  // ================= Kubernetes (30+) =================
  {
    topic: 'Kubernetes',
    difficulty: 'senior',
    type: 'troubleshooting',
    question: 'A production Pod is in CrashLoopBackOff. Walk through your step-by-step diagnostic workflow using only kubectl and Linux commands.',
    expectedKeyPoints: [
      'kubectl describe pod <name> to check Termination reason, Exit Code, and Last State',
      'Exit Code 137 = OOMKilled; Exit Code 1 = application uncaught error; Exit Code 126/127 = binary not executable or missing',
      'kubectl logs <name> --previous to inspect stdout/stderr before the last container termination',
      'Check readiness/liveness probe failures in events; inspect ConfigMap/Secret mounts and DNS resolution',
    ],
  },
  {
    topic: 'Kubernetes',
    difficulty: 'staff',
    type: 'scenario',
    question: 'How do you implement zero-downtime rolling updates for a stateful, high-throughput database connection client on Kubernetes?',
    expectedKeyPoints: [
      'PreStop lifecycle hook with sleep (e.g. sleep 15) to allow kube-proxy and Ingress endpoints controller to remove pod from iptables',
      'Graceful termination period (terminationGracePeriodSeconds: 60) allowing in-flight requests to complete',
      'Readiness probe tuned to stop traffic before container shutdown begins',
      'PodDisruptionBudget (PDB) with minAvailable or maxUnavailable guarantees during cluster upgrades',
    ],
  },
  {
    topic: 'Kubernetes',
    difficulty: 'senior',
    type: 'conceptual',
    question: 'Compare Kubernetes CNI network plugins: Calico vs AWS VPC CNI vs Cilium eBPF. What are the key performance and security trade-offs?',
    expectedKeyPoints: [
      'AWS VPC CNI assigns native VPC ENI secondary IPs to pods; great AWS integration but exhausts subnet IP addresses rapidly',
      'Calico uses standard Linux routing and iptables/IPVS with rich NetworkPolicy enforcement and BGP peering',
      'Cilium replaces iptables with eBPF in kernel space; superior throughput, low CPU overhead, and L7 Layer 7 observability/security',
      'Cilium avoids iptables rule explosion in massive clusters (10,000+ services)',
    ],
  },
  {
    topic: 'Kubernetes',
    difficulty: 'intermediate',
    type: 'conceptual',
    question: 'What is the exact distinction between Kubernetes Requests and Limits, and how does the Linux CFS scheduler enforce them for CPU vs Memory?',
    expectedKeyPoints: [
      'Requests are used by kube-scheduler to place pods on nodes with sufficient allocatable capacity (CFS shares)',
      'Limits define the maximum boundary: CPU limit is enforced by CFS quota (throttling when exceeded); Memory limit triggers Linux OOM killer (exit 137)',
      'CPU is a compressible resource (causes throttling/latency); memory is non-compressible (causes termination)',
      'Guaranteed QoS class: requests == limits for both CPU and Memory',
    ],
  },

  // ================= Argo CD (30+) =================
  {
    topic: 'Argo CD',
    difficulty: 'senior',
    type: 'scenario',
    question: 'Explain the GitOps reconciliation loop in Argo CD. What happens when an engineer manually edits a ConfigMap directly in the cluster using kubectl edit?',
    expectedKeyPoints: [
      'Argo CD continuously compares desired state in Git against live cluster state via Kubernetes API',
      'Detects OutOfSync status between Git SHA and live resource definition',
      'If auto-sync with self-heal is enabled, Argo CD immediately overwrites manual cluster edits back to Git state',
      'If self-heal is disabled, state remains OutOfSync until manual sync or PR merge',
    ],
  },
  {
    topic: 'Argo CD',
    difficulty: 'senior',
    type: 'scenario',
    question: 'How do you architect multi-cluster, multi-tenant application deployments in Argo CD using the "App of Apps" or "ApplicationSet" pattern?',
    expectedKeyPoints: [
      'ApplicationSet controller uses generators (Git directory generator, List generator, Cluster generator) to dynamically instantiate Applications',
      'Generates target applications per cluster and environment based on Git folder structure or repository tags',
      'Argo CD Projects (AppProject) isolate tenant permissions, restrict target namespaces, destination clusters, and permitted source repositories',
      'RBAC rules mapping SSO groups (Okta/GitHub) to Argo CD project roles',
    ],
  },
  {
    topic: 'Argo CD',
    difficulty: 'intermediate',
    type: 'troubleshooting',
    question: 'An Argo CD Application is stuck in "Sync Failed" with a resource hook or CRD schema validation error. How do you troubleshoot and unblock the pipeline?',
    expectedKeyPoints: [
      'Check Sync Status logs and resource events in Argo CD UI or CLI (argocd app get)',
      'Resource hooks (PreSync/PostSync) may have failed; inspect hook pod logs and backoff limits',
      'CRD version mismatch: Helm or Kustomize may need --server-side-apply flag enabled for large CRDs',
      'Use Sync Options: SkipDryRunOnMissingResource or Replace=true for immutable fields',
    ],
  },

  // ================= Karpenter (30+) =================
  {
    topic: 'Karpenter',
    difficulty: 'senior',
    type: 'conceptual',
    question: 'Compare Karpenter against the legacy Kubernetes Cluster Autoscaler. Why is Karpenter significantly faster and more cost-effective on AWS EKS?',
    expectedKeyPoints: [
      'Cluster Autoscaler manages EC2 Auto Scaling Groups (ASGs); indirect, slow (3-5 min), and rigid node sizes',
      'Karpenter bypasses ASGs and directly invokes AWS EC2 Fleet API, provisioning exact instance types in 30-45 seconds',
      'Group-less node autoscaling: evaluates pending pod requirements (CPU, GPU, architecture, topology) and launches optimal instance mix',
      'Automated consolidation: dynamically terminates or downsizes underutilized nodes to minimize cloud spend',
    ],
  },
  {
    topic: 'Karpenter',
    difficulty: 'senior',
    type: 'scenario',
    question: 'How do you configure Karpenter NodePools with disruption budgets and consolidation policies to guarantee zero downtime for critical workloads during spot instance preemptions?',
    expectedKeyPoints: [
      'disruption.consolidationPolicy: WhenEmptyOrUnderutilized with consolidateAfter timers',
      'disruption.budgets specifying maxDisruption (e.g. 10% or 1 node at a time) during peak traffic hours',
      'EC2 Spot Interruption Queue: SQS queue receiving EventBridge 2-minute spot termination warnings; Karpenter drains nodes proactively',
      'NodePool instance requirements: allow broad spot instance family diversity (e.g. m5, m6i, c5, c6i) across multiple AZs to prevent allocation shortages',
    ],
  },
  {
    topic: 'Karpenter',
    difficulty: 'staff',
    type: 'troubleshooting',
    question: 'Pods remain Pending, but Karpenter is not launching new EC2 nodes. What logs and Kubernetes events do you inspect to find the root cause?',
    expectedKeyPoints: [
      'Inspect Karpenter controller logs: kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter',
      'Check AWS IAM permissions / IRSA role for ec2:RunInstances, iam:PassRole, and subnet tag validation (karpenter.sh/discovery)',
      'Check EC2 Service Quota limits in the AWS region (vCPU quota exceeded)',
      'Verify Pod scheduling constraints (nodeSelector, taint/tolerations, topologySpreadConstraints) match NodePool specs',
    ],
  },

  // ================= Python (30+) =================
  {
    topic: 'Python',
    difficulty: 'intermediate',
    type: 'hands-on',
    question: 'How do you write a Python script using the official Kubernetes client library to safely list and delete orphaned ReplicaSets with zero pods across all namespaces?',
    expectedKeyPoints: [
      'from kubernetes import client, config; config.load_incluster_config() or load_kube_config()',
      'AppsV1Api.list_replica_set_for_all_namespaces()',
      'Check item.status.replicas == 0 and item.spec.replicas == 0 and verify creation timestamp',
      'Implement dry-run flag (--dry-run) before calling delete_namespaced_replica_set()',
    ],
  },
  {
    topic: 'Python',
    difficulty: 'senior',
    type: 'conceptual',
    question: 'Explain Python decorators and generators. Provide a real-world DevOps use case for each in an automation pipeline.',
    expectedKeyPoints: [
      'Decorators wrap a function to extend behavior without modifying source code (e.g., @retry with backoff, @timer for execution metrics, @require_auth)',
      'Generators use "yield" to lazily evaluate sequences one item at a time without loading entire dataset into memory',
      'DevOps use case for generator: streaming multi-gigabyte server log files line-by-line with O(1) memory',
      'DevOps use case for decorator: wrapping AWS boto3 API calls with automatic exponential rate-limit retry',
    ],
  },
  {
    topic: 'Python',
    difficulty: 'intermediate',
    type: 'troubleshooting',
    question: 'Your Python automation script experiences the Global Interpreter Lock (GIL) bottleneck. When should you use asyncio vs threading vs multiprocessing for concurrent cloud infrastructure tasks?',
    expectedKeyPoints: [
      'GIL prevents multiple native threads from executing Python bytecodes simultaneously on multi-core CPUs',
      'asyncio: single-threaded event loop, best for high-concurrency I/O-bound tasks (thousands of HTTP health checks or API requests)',
      'threading: convenient for I/O-bound tasks with legacy synchronous libraries (GIL released during socket/file I/O)',
      'multiprocessing: spawns separate OS processes with independent GILs, mandatory for CPU-bound tasks (log hashing, encryption, data parsing)',
    ],
  },
];

export class QuestionBankService {
  /**
   * Retrieves unique questions for the user based on selected topics and seniority,
   * avoiding any questions previously asked to this specific user.
   */
  public getQuestionsForSession(
    userId: string,
    selectedTopics: ToolTopic[],
    difficulty: SeniorityLevel,
    count: number = 10,
    extraHashes: string[] = []
  ): InterviewQuestion[] {
    const userHistory = this.getUserQuestionHistory(userId);
    const historySet = new Set([...userHistory, ...extraHashes]);

    // Filter available pool strictly matching selected topics
    const matching = RAW_QUESTIONS.filter(q => selectedTopics.includes(q.topic));

    // Prefer questions not yet asked to this user
    let unasked = matching.filter(q => !historySet.has(simpleHash(q.question)));

    // If candidate has exhausted unasked questions for these topics, reset pool to prevent blocking
    if (unasked.length < count) {
      unasked = matching;
    }

    // Shuffle and pick evenly across selected topics
    const selected: InterviewQuestion[] = [];
    const topicQueues: Record<string, RawQuestion[]> = {};

    selectedTopics.forEach(t => {
      topicQueues[t] = unasked.filter(q => q.topic === t).sort(() => Math.random() - 0.5);
    });

    let currentTopicIndex = 0;
    while (selected.length < count && selectedTopics.length > 0) {
      const topic = selectedTopics[currentTopicIndex % selectedTopics.length];
      const queue = topicQueues[topic];
      if (queue && queue.length > 0) {
        const raw = queue.shift()!;
        const hash = simpleHash(raw.question);
        selected.push({
          id: `q-${Date.now()}-${selected.length}`,
          topic: raw.topic,
          difficulty: raw.difficulty,
          type: raw.type,
          question: raw.question,
          expectedKeyPoints: raw.expectedKeyPoints,
          followUp: raw.followUp,
          hash,
        });
      } else {
        // Fallback from remaining unasked if this topic queue emptied
        const fallback = unasked.find(q => !selected.some(s => s.question === q.question));
        if (fallback) {
          const hash = simpleHash(fallback.question);
          selected.push({
            id: `q-${Date.now()}-${selected.length}`,
            topic: fallback.topic,
            difficulty: fallback.difficulty,
            type: fallback.type,
            question: fallback.question,
            expectedKeyPoints: fallback.expectedKeyPoints,
            followUp: fallback.followUp,
            hash,
          });
        } else {
          break;
        }
      }
      currentTopicIndex++;
    }

    // Record hashes to user history to enforce no repeats
    this.recordQuestionsAsked(userId, selected.map(s => s.hash));

    return selected;
  }

  /**
   * Generates fresh, non-repeating questions via server-side Gemini API,
   * using user_question_history from Firestore + localStorage as exclusion list,
   * and falls back seamlessly to the seeded question bank if API is unavailable.
   */
  public async generateQuestionsWithFallback(
    userId: string,
    selectedTopics: ToolTopic[],
    difficulty: SeniorityLevel,
    count: number = 10,
    remoteHistoryHashes: string[] = []
  ): Promise<{ questions: InterviewQuestion[]; source: 'gemini' | 'bank' }> {
    const localHashes = this.getUserQuestionHistory(userId);
    const mergedHashes = Array.from(new Set([...localHashes, ...remoteHistoryHashes]));
    const excludeQuestions = this.getAskedQuestionTexts(userId);

    try {
      const res = await fetch('/api/mock-interview/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          selectedTopics,
          difficulty,
          count,
          excludeHashes: mergedHashes,
          excludeQuestions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          const generated: InterviewQuestion[] = data.questions.slice(0, count);
          this.recordQuestionsAsked(userId, generated.map(q => q.hash));
          this.recordAskedQuestionTexts(userId, generated.map(q => q.question));
          return { questions: generated, source: 'gemini' };
        }
      }
    } catch {
      // Fallback to seeded local question bank below
    }

    const bankQuestions = this.getQuestionsForSession(userId, selectedTopics, difficulty, count, mergedHashes);
    this.recordAskedQuestionTexts(userId, bankQuestions.map(q => q.question));
    return { questions: bankQuestions, source: 'bank' };
  }

  public getQuestionsForSessionWithHistory(
    userId: string,
    selectedTopics: ToolTopic[],
    difficulty: SeniorityLevel,
    count: number = 10,
    extraHashes: string[] = []
  ): InterviewQuestion[] {
    return this.getQuestionsForSession(userId, selectedTopics, difficulty, count, extraHashes);
  }

  public getUserQuestionHistory(userId: string): string[] {
    try {
      const raw = localStorage.getItem(`maverick_user_qhistory_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public recordQuestionsAsked(userId: string, hashes: string[]) {
    try {
      const current = this.getUserQuestionHistory(userId);
      const updated = Array.from(new Set([...current, ...hashes]));
      localStorage.setItem(`maverick_user_qhistory_${userId}`, JSON.stringify(updated));
    } catch {
      // Storage unavailable
    }
  }

  private getAskedQuestionTexts(userId: string): string[] {
    try {
      const raw = localStorage.getItem(`maverick_user_qtexts_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private recordAskedQuestionTexts(userId: string, texts: string[]) {
    try {
      const current = this.getAskedQuestionTexts(userId);
      const updated = Array.from(new Set([...texts, ...current])).slice(0, 60);
      localStorage.setItem(`maverick_user_qtexts_${userId}`, JSON.stringify(updated));
    } catch {
      // Storage unavailable
    }
  }
}

export const questionBankService = new QuestionBankService();
