import React, { useState } from 'react';
import { 
  Cloud, 
  Server, 
  Terminal, 
  Activity, 
  ShieldAlert, 
  GitBranch, 
  Search, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

interface Scenario {
  id: string;
  title: string;
  category: 'Kubernetes' | 'AWS' | 'Linux' | 'Terraform' | 'CI/CD' | 'SRE';
  severity: 'Critical P1' | 'High P2';
  symptom: string;
  rootCause: string;
  stepByStepTriage: string[];
  seniorKeyPoints: string[];
  sampleCommand: string;
}

export const InterviewPrepPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScenario, setActiveScenario] = useState<string>('k8s-oom');
  const [copied, setCopied] = useState(false);

  const scenarios: Scenario[] = [
    {
      id: 'k8s-oom',
      title: 'Kubernetes Pod OOMKilled (Exit Code 137)',
      category: 'Kubernetes',
      severity: 'Critical P1',
      symptom: 'Service pods repeatedly dying during peak traffic with Exit Code 137 in Last State.',
      rootCause: 'Container memory exceeded cgroup memory limit or node kernel invoked OOM killer due to memory pressure.',
      stepByStepTriage: [
        'Run "kubectl describe pod <pod-name>" and verify Last State: Terminated, Reason: OOMKilled, Exit Code: 137.',
        'Run "kubectl logs <pod-name> --previous" to inspect memory dumps or heap allocation traces before crash.',
        'Compare Prometheus container_memory_working_set_bytes against kube_pod_container_resource_limits.',
        'If JVM application, verify -XX:MaxRAMPercentage=75.0 is configured so JVM respects container cgroups.',
        'Adjust pod resource limits in Helm values or horizontal pod autoscaling threshold.',
      ],
      seniorKeyPoints: [
        'Distinguish container cgroup OOM (kernel kills only the violating container) from node-level OOM (kubelet evicts pods).',
        'Working set memory includes anonymous memory + dirty page cache; never benchmark RSS alone.',
      ],
      sampleCommand: 'kubectl get pod -l app=checkout -o jsonpath="{range .items[*]}{.metadata.name}{\'\\t\'}{.status.containerStatuses[*].lastState.terminated.reason}{\'\\n\'}{end}"',
    },
    {
      id: 'k8s-crashloop',
      title: 'Kubernetes Pod CrashLoopBackOff',
      category: 'Kubernetes',
      severity: 'Critical P1',
      symptom: 'Pods cycling in CrashLoopBackOff with restart counts rapidly climbing.',
      rootCause: 'Application runtime panic, missing configuration secret/ConfigMap, or failing liveness probe.',
      stepByStepTriage: [
        'Check pod events via "kubectl describe pod <name>" to inspect failed livenessProbe or initContainers.',
        'Check previous logs: "kubectl logs <name> -c <container> --previous" for uncaught exceptions or database connection refusal.',
        'Verify required secrets exist and IAM Roles for Service Accounts (IRSA) have correct AssumeRoleWithWebIdentity.',
        'If liveness probe kills slow-starting container, increase initialDelaySeconds or replace with startupProbe.',
      ],
      seniorKeyPoints: [
        'Decouple livenessProbe (restarts deadlocks) from readinessProbe (removes unready pods from endpoints).',
        'Use startupProbe for legacy monoliths with slow cache warmups to avoid premature restarts.',
      ],
      sampleCommand: 'kubectl logs deploy/payment-service --previous --tail=100',
    },
    {
      id: 'alb-503',
      title: 'AWS ALB HTTP 503 Service Temporarily Unavailable',
      category: 'AWS',
      severity: 'Critical P1',
      symptom: 'Clients receiving HTTP 503 errors while visiting the web app during marketing event.',
      rootCause: 'No healthy targets registered in target group, target group capacity exhausted, or target connection queue full.',
      stepByStepTriage: [
        'Check CloudWatch metric "HTTPCode_ELB_503_Count" vs "HTTPCode_Target_5XX_Count" to verify if ALB or upstream generates the 503.',
        'Inspect Target Group health: verify if healthy target percentage dropped below minimum thresholds.',
        'Check if pods are failing HTTP health checks (/healthz returning non-200 or timing out after 5s).',
        'Verify Karpenter / Cluster Autoscaler is provisioning nodes; check for AWS API throttling on CreateFleet.',
      ],
      seniorKeyPoints: [
        'ALB generated 503 means zero targets available; Target generated 503 means the backend application returned the status.',
        'Configure deregistration_delay (connection draining) properly during rolling deployments.',
      ],
      sampleCommand: 'aws elbv2 describe-target-health --target-group-arn <TARGET-GROUP-ARN>',
    },
    {
      id: 'terraform-lock',
      title: 'Terraform State Lock Timeout Error',
      category: 'Terraform',
      severity: 'High P2',
      symptom: 'CI/CD pipeline failed with "Error acquiring the state lock: ConditionalCheckFailedException".',
      rootCause: 'Previous pipeline job crashed without releasing DynamoDB lock or concurrent pipeline run is executing.',
      stepByStepTriage: [
        'Inspect the Lock Info output in the error message for Info: Lock ID (UUID), Created by, and Operation.',
        'Verify in GitHub Actions / Jenkins whether the pipeline that created the lock is genuinely still running.',
        'If the agent container died abruptly and no process is active, obtain authorization to force unlock.',
        'Execute "terraform force-unlock <LOCK-ID>" strictly after team verification.',
      ],
      seniorKeyPoints: [
        'Never run force-unlock without validating whether another teammate or background CI worker is mid-apply.',
        'Partition large monolithic state files into layered modules to minimize lock contention blast radius.',
      ],
      sampleCommand: 'terraform force-unlock -force b5914652-32a7-68b2-75d8-c923d8c11f71',
    },
    {
      id: 'linux-cpu-load',
      title: 'High Linux CPU Load Average with Low CPU Usage',
      category: 'Linux',
      severity: 'High P2',
      symptom: 'System load average is 64 on an 8-core machine, but "top" shows CPU utilization at only 12%.',
      rootCause: 'Processes stuck in uninterruptible sleep state (TASK_UNINTERRUPTIBLE / "D" state), typically waiting on disk I/O or NFS storage.',
      stepByStepTriage: [
        'Run "top" or "htop" and inspect the process state column (look for state "D").',
        'Run "vmstat 1 5" and check the "b" column (processes blocked on I/O) and "wa" column (I/O wait).',
        'Run "iostat -xz 1 5" to identify saturated disk devices with %util close to 100%.',
        'Check dmesg for kernel storage controller timeouts, SAN network disconnects, or dead NFS mounts.',
      ],
      seniorKeyPoints: [
        'Linux load average measures both CPU runnable threads and threads in uninterruptible disk I/O sleep.',
        'Processes in "D" state cannot be killed even with "kill -9"; resolving the underlying storage hang is mandatory.',
      ],
      sampleCommand: 'ps aux | awk \'$8 ~ /D/ {print $0}\'',
    },
    {
      id: 'jenkins-pipeline-fail',
      title: 'CI/CD Agent OOM & Docker Socket Permission Denial',
      category: 'CI/CD',
      severity: 'High P2',
      symptom: 'Pipeline build failed with "Got permission denied while trying to connect to the Docker daemon socket".',
      rootCause: 'CI agent runner user not in the "docker" group or rootless Docker socket path not mounted.',
      stepByStepTriage: [
        'Verify user executing the build agent via "id" or "whoami".',
        'Inspect socket permissions: "ls -la /var/run/docker.sock".',
        'Add jenkins runner user to docker group: "sudo usermod -aG docker jenkins".',
        'For Kubernetes runners, recommend Kaniko or Buildah to build images without mounting the root Docker socket.',
      ],
      seniorKeyPoints: [
        'Mounting /var/run/docker.sock into containers gives root access to the host node (major container breakout vulnerability).',
        'Modern enterprise pipelines use daemonless builders like Kaniko or BuildKit rootless with Cosign image signing.',
      ],
      sampleCommand: 'docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .',
    },
  ];

  const categories = ['All', 'Kubernetes', 'AWS', 'Linux', 'Terraform', 'CI/CD'];

  const filteredScenarios = scenarios.filter(sc => {
    const matchesCat = selectedCategory === 'All' || sc.category === selectedCategory;
    const matchesSearch = sc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sc.rootCause.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const selectedScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];

  const handleCopyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          DevOps & SRE Interview Specialization
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Master real-world production incident triage, Kubernetes internals, AWS resilience, and Terraform patterns.
        </p>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            placeholder="Search incident triage scenarios..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      {/* Main Grid: List of Scenarios on Left, Deep Dive on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scenario Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredScenarios.map(sc => (
            <button
              key={sc.id}
              onClick={() => setActiveScenario(sc.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                activeScenario === sc.id
                  ? 'bg-neutral-850 border-indigo-500/80 shadow-md'
                  : 'bg-neutral-900/70 hover:bg-neutral-850/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                  {sc.category}
                </span>
                <span className="font-mono text-rose-400 font-semibold">{sc.severity}</span>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">{sc.title}</h3>
              <p className="text-[11px] text-neutral-400 line-clamp-2">{sc.symptom}</p>
            </button>
          ))}
        </div>

        {/* Right Column: Active Scenario Deep Dive (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
              <span>{selectedScenario.category} Incident Scenario</span>
              <span>·</span>
              <span className="text-rose-400">{selectedScenario.severity}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{selectedScenario.title}</h2>
            <div className="mt-2 p-3 bg-neutral-950/70 rounded-xl border border-neutral-800/80 text-xs text-neutral-300">
              <strong className="text-white">Observed Symptom: </strong>
              {selectedScenario.symptom}
            </div>
          </div>

          {/* Root Cause */}
          <div>
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Underlying Root Cause
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60">
              {selectedScenario.rootCause}
            </p>
          </div>

          {/* Step-by-Step Triage Workflow */}
          <div>
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Production Triage Sequence
            </h4>
            <div className="space-y-2">
              {selectedScenario.stepByStepTriage.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 bg-neutral-950/60 border border-neutral-800/60 rounded-lg text-xs"
                >
                  <span className="font-mono font-bold text-indigo-400 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-neutral-200 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Senior Key Points to Mention */}
          <div>
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Senior Engineer Differentiators
            </h4>
            <ul className="space-y-1.5 text-xs text-neutral-300 list-disc list-inside">
              {selectedScenario.seniorKeyPoints.map((point, idx) => (
                <li key={idx} className="leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Diagnostic Command Line */}
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span className="font-mono">Triage Command</span>
              <button
                onClick={() => handleCopyCmd(selectedScenario.sampleCommand)}
                className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <pre className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto">
              {selectedScenario.sampleCommand}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
