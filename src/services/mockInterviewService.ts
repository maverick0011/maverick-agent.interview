/**
 * Maverick AI - Mock Interview Studio Service
 * Tracks: DevOps, SRE, Platform, Kubernetes, System Design, Behavioral
 */

import { MockInterviewSession, MockInterviewQuestion } from '../types';

export class MockInterviewService {
  getQuestionsForTrack(track: string, difficulty: 'intermediate' | 'senior' | 'staff'): MockInterviewQuestion[] {
    const questionsByTrack: Record<string, MockInterviewQuestion[]> = {
      devops: [
        {
          id: 'devops-q1',
          question: 'How do you design an enterprise CI/CD pipeline that enforces security controls like container vulnerability scanning and cryptographic signing without slowing down developer velocity?',
          category: 'CI/CD & Security',
          difficulty,
          expectedKeyPoints: [
            'Shift-left static analysis (SAST, SonarQube) in PR branch builds',
            'Image scanning via Trivy or Clair with severity gates (block on CRITICAL with known fix)',
            'Cryptographic signing via Cosign / Sigstore and verifying with Kyverno admission controllers',
            'Caching layers (Docker buildx cache) to keep pipeline duration under 10 minutes',
          ],
        },
        {
          id: 'devops-q2',
          question: 'Walk me through your strategy for managing Terraform state across multiple environments (dev, staging, prod) with zero blast radius spillover.',
          category: 'Infrastructure as Code',
          difficulty,
          expectedKeyPoints: [
            'Separate state files per environment and per architectural layer',
            'Remote state backend with S3 encryption, versioning, and DynamoDB locking',
            'Terragrunt or directory-based workspace partitioning to avoid monolithic blast radius',
            'Automated pull-request planning via Atlantis or Terraform Cloud',
          ],
        },
        {
          id: 'devops-q3',
          question: 'Describe how you would debug a high-latency issue where response times spike from 40ms to 2.8s during an automated canary deployment.',
          category: 'Deployment & Telemetry',
          difficulty,
          expectedKeyPoints: [
            'Argo Rollouts automated analysis metric gates evaluating p99 latency',
            'Compare canary pod logs and Jaeger/OpenTelemetry distributed traces vs baseline pods',
            'Inspect database connection pool exhaustion or cold cache warmup',
            'Automated rollback trigger when error budget burns exceed thresholds',
          ],
        },
      ],
      sre: [
        {
          id: 'sre-q1',
          question: 'How do you define meaningful SLIs and SLOs for a mission-critical payments API, and what operational policies do you enforce when an error budget is exhausted?',
          category: 'Site Reliability Engineering',
          difficulty,
          expectedKeyPoints: [
            'Focus on customer perspective (e.g., 99.95% successful requests < 200ms measured at ingress)',
            'Multi-window multi-burn-rate alerting for fast and slow burn detection',
            'Clear error-budget policy: feature freeze, technical debt prioritization, and reliability sprint',
            'Post-incident review without human blame (blameless postmortem)',
          ],
        },
        {
          id: 'sre-q2',
          question: 'Your primary AWS region is suffering an availability zone outage causing 50% packet drop. How do you automate zonal evacuation for an EKS cluster?',
          category: 'Incident Response & Resilience',
          difficulty,
          expectedKeyPoints: [
            'AWS Route 53 Application Recovery Controller (ARC) zonal routing controls',
            'ALB target group health check thresholds to drop degraded zone targets quickly',
            'Karpenter / Cluster Autoscaler node provisioning in remaining healthy AZs',
            'Pre-provisioned headroom capacity (20-30%) across surviving AZs',
          ],
        },
        {
          id: 'sre-q3',
          question: 'Explain how you troubleshoot memory leak issues in containerized workloads where pods are repeatedly terminated with exit code 137.',
          category: 'Linux & Cgroups',
          difficulty,
          expectedKeyPoints: [
            'Inspect cgroup memory limits vs host OS kernel OOM killer trigger',
            'Capture heap dumps before container termination using preStop hooks or eBPF profilers',
            'Correlate container_memory_working_set_bytes vs memory RSS in Prometheus',
            'Tune runtime memory settings (e.g. JVM -XX:MaxRAMPercentage=75.0 or Go GOMEMLIMIT)',
          ],
        },
      ],
      kubernetes: [
        {
          id: 'k8s-q1',
          question: 'Explain the internal architecture of the Kubernetes control plane. What happens step-by-step when a user runs "kubectl apply -f deployment.yaml"?',
          category: 'Kubernetes Internals',
          difficulty,
          expectedKeyPoints: [
            'API Server authentication, authorization (RBAC), and mutating/validating admission webhooks',
            'etcd persistent storage commit',
            'DeploymentController detects new resource, reconciles and creates ReplicaSet',
            'ReplicaSetController reconciles and creates Pod objects with Pending status',
            'kube-scheduler filters and scores nodes, binds pod to selected node',
            'kubelet on target node invokes CRI, CNI, and CSI plugins to pull image and launch container',
          ],
        },
        {
          id: 'k8s-q2',
          question: 'How do you secure multi-tenant Kubernetes clusters against lateral movement and privilege escalation?',
          category: 'Kubernetes Security',
          difficulty,
          expectedKeyPoints: [
            'Namespace isolation with strict NetworkPolicies (deny-all ingress/egress by default)',
            'SecurityContext enforcing non-root users, readOnlyRootFilesystem, and dropping Linux capabilities',
            'Policy admission controllers like Kyverno or OPA Gatekeeper',
            'Service mesh mTLS (Istio/Linkerd) and node-level eBPF isolation (Cilium)',
          ],
        },
      ],
      behavioral: [
        {
          id: 'beh-q1',
          question: 'Tell me about a high-severity production incident you led. How did you coordinate the incident response, communicate with stakeholders, and ensure prevention?',
          category: 'Leadership & Incident Management',
          difficulty,
          expectedKeyPoints: [
            'Clear Incident Commander role separation from technical investigators',
            'Frequent stakeholder cadence (status page updates every 15-20 min)',
            'Data-driven decision making and safe mitigation over hasty fixes',
            'Publishing a transparent, blameless post-mortem with actionable JIRA remediations',
          ],
        },
        {
          id: 'beh-q2',
          question: 'Describe a time when you disagreed with a principal architect or engineering director on a critical technology choice. How did you navigate the discussion?',
          category: 'Technical Communication & Alignment',
          difficulty,
          expectedKeyPoints: [
            'Objective evaluation criteria (cost, maintenance, community support, team skills)',
            'Building a quick proof-of-concept (POC) to produce empirical latency/cost benchmarks',
            'Presenting findings collaboratively without adversarial framing',
            'Committing fully to the final decision once made ("Disagree and commit")',
          ],
        },
      ],
    };

    return questionsByTrack[track] || questionsByTrack['devops'];
  }

  /**
   * Evaluate user's answer and produce structured rubric scores
   */
  evaluateAnswer(question: MockInterviewQuestion, userAnswer: string): NonNullable<MockInterviewQuestion['evaluation']> {
    const text = userAnswer.trim();
    const words = text.split(/\s+/).filter(Boolean);
    const length = words.length;

    // Evaluate key point coverage
    const lower = text.toLowerCase();
    const hits: string[] = [];
    const misses: string[] = [];

    question.expectedKeyPoints.forEach(kp => {
      const tokens = kp.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      const matchCount = tokens.filter(t => lower.includes(t)).length;
      if (matchCount >= 2) {
        hits.push(kp);
      } else {
        misses.push(kp);
      }
    });

    const coverage = hits.length / question.expectedKeyPoints.length;
    
    // Calculate balanced scores
    const technicalScore = Math.min(96, Math.max(45, Math.round(55 + coverage * 40 + (length > 60 ? 5 : 0))));
    const problemSolvingScore = Math.min(95, Math.max(50, Math.round(58 + coverage * 35 + (lower.includes('because') || lower.includes('mitigate') ? 6 : 0))));
    const communicationScore = Math.min(98, Math.max(55, Math.round(60 + (length > 40 ? 25 : 10) + (lower.includes('first') || lower.includes('second') ? 10 : 0))));
    const practicalExperienceScore = Math.min(95, Math.max(50, Math.round(technicalScore * 0.95 + (lower.includes('production') || lower.includes('in my') ? 8 : 0))));
    const confidenceScore = Math.min(94, Math.max(55, Math.round((technicalScore + communicationScore) / 2)));

    return {
      technicalScore,
      problemSolvingScore,
      communicationScore,
      practicalExperienceScore,
      confidenceScore,
      strengths: [
        hits.length > 0 ? `Demonstrated knowledge of ${hits[0].split('(')[0]}` : 'Addressed the core architectural premise',
        length > 50 ? 'Structured response with practical troubleshooting perspective' : 'Concise and direct answer formulation',
      ],
      improvements: misses.length > 0 ? [
        `Consider incorporating: ${misses[0]}`,
        'Quantify operational impacts (e.g. latency targets, MTTR metrics, cost delta)',
      ] : [
        'Elaborate on edge-case failure modes under heavy concurrency',
      ],
      modelAnswer: `In production, I approach this systematically:
1. Primary Architecture & Controls: ${question.expectedKeyPoints[0] || 'Isolate blast radius and enforce declarative config'}
2. Resiliency & Telemetry: ${question.expectedKeyPoints[1] || 'Monitor golden signals with automated thresholds'}
3. Production Validation: ${question.expectedKeyPoints[2] || 'Automate canary rollouts and postmortem accountability'}`,
    };
  }

  createSession(track: 'devops' | 'sre' | 'platform' | 'kubernetes' | 'system_design' | 'behavioral', difficulty: 'intermediate' | 'senior' | 'staff'): MockInterviewSession {
    const questions = this.getQuestionsForTrack(track, difficulty);
    return {
      id: `mock-${Date.now()}`,
      title: `${track.toUpperCase()} Technical Mock (${difficulty.toUpperCase()})`,
      track,
      difficulty,
      status: 'in_progress',
      currentQuestionIndex: 0,
      questions,
      createdAt: new Date().toISOString(),
    };
  }
}

export const mockInterviewService = new MockInterviewService();
