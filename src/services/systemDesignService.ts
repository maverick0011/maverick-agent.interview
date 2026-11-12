/**
 * Maverick AI - System Design Studio Service
 * Generates Mermaid architecture diagrams, specifications, and trade-off matrices
 */

import { SystemDesignDiagram } from '../types';

export class SystemDesignService {
  /**
   * Pre-built architecture templates for common interview questions
   */
  getPrebuiltTemplates(): SystemDesignDiagram[] {
    return [
      {
        id: 'sd-ecommerce',
        title: 'High-Availability Scalable E-Commerce Platform',
        prompt: 'Design a scalable e-commerce platform handling 60,000 QPS flash-sale traffic with zero inventory overselling.',
        architectureType: 'microservices',
        scaleRequirements: {
          qps: '60,000 peak read / 8,000 write',
          storage: '12 TB PostgreSQL + 4 TB Redis Cluster',
          latency: 'p99 < 85ms for checkout',
          availability: '99.99% multi-region redundancy',
        },
        mermaidCode: `flowchart TD
    Client["Global Users / Mobile App"] --> CF["Cloudflare CDN & WAF"]
    CF --> ALB["AWS Application Load Balancer"]
    ALB --> AGW["Envoy API Gateway (Rate Limiting)"]

    subgraph ServiceMesh ["EKS Kubernetes Cluster (Istio Service Mesh)"]
        AGW --> Auth["Auth Service (JWT)"]
        AGW --> Catalog["Product Catalog (Read Heavy)"]
        AGW --> Order["Order Orchestrator"]
        AGW --> Inv["Inventory Service (Atomic Locks)"]
    end

    Catalog --> Redis["Redis Sentinel Cache"]
    Order --> Kafka["Kafka Event Bus (Order Events)"]
    Kafka --> Payment["Payment Worker"]
    Kafka --> Notification["Notification Worker (SES)"]

    Inv --> RedisLock["Redis Redlock (Reservation)"]
    Inv --> Aurora["Amazon Aurora PostgreSQL (Write Master)"]
    Catalog --> AuroraRead["Aurora Read Replicas"]

    Payment --> Stripe["Stripe API Gateway"]`,
        explanation: 'Uses an asynchronous event-driven architecture with Kafka to decouple order ingestion from payment settlement. Inventory overselling is prevented via Redis Redlock atomic decrements before queuing order events, ensuring DB write serialization under flash sales.',
        components: [
          { name: 'Envoy API Gateway', technology: 'Envoy / Istio', purpose: 'Token-bucket rate limiting and TLS 1.3 termination.' },
          { name: 'Inventory Lock Engine', technology: 'Redis Cluster / Redlock', purpose: 'Sub-millisecond atomic inventory decrement to avoid overselling.' },
          { name: 'Order Event Bus', technology: 'Apache Kafka', purpose: 'Guaranteed at-least-once message delivery for order fulfillment.' },
          { name: 'Primary Store', technology: 'Aurora PostgreSQL', purpose: 'ACID transaction boundary with read replicas in multiple AZs.' },
        ],
        tradeoffs: [
          'Eventual consistency between order placement and receipt email generation chosen to maintain p99 under 85ms.',
          'Redis Redlock introduces distributed lock complexity but eliminates relational database lock contention on hot inventory rows.',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sd-k8s-multi-region',
        title: 'Kubernetes Multi-Region Active-Active Deployment',
        prompt: 'Design a resilient Kubernetes deployment across AWS us-east-1 and us-west-2 with automated failover.',
        architectureType: 'kubernetes_cloud',
        scaleRequirements: {
          qps: '120,000 QPS distributed Anycast',
          storage: 'Aurora Global Database (< 1s replica lag)',
          latency: 'Cross-region failover < 60s MTTR',
          availability: '99.999% SLA',
        },
        mermaidCode: `flowchart LR
    subgraph Edge ["Global Ingress Tier"]
        Users["Global Clients"] --> GA["AWS Global Accelerator (Anycast IP)"]
        GA --> R53["Route 53 Application Recovery Controller"]
    end

    subgraph RegionEast ["AWS Region: us-east-1 (Primary)"]
        R53 --> ALBEast["ALB (us-east-1)"]
        ALBEast --> EKSEast["EKS Cluster East (Karpenter)"]
        EKSEast --> PodEast["Microservices Pods"]
        PodEast --> DBEast[("Aurora Primary (Read/Write)")]
    end

    subgraph RegionWest ["AWS Region: us-west-2 (Secondary)"]
        R53 --> ALBWest["ALB (us-west-2)"]
        ALBWest --> EKSWest["EKS Cluster West (Karpenter)"]
        EKSWest --> PodWest["Microservices Pods"]
        PodWest --> DBWest[("Aurora Secondary (Read Replica)")]
    end

    DBEast -. Storage-level Async Replication < 1s .-> DBWest
    Argo["ArgoCD GitOps Central Control"] --> EKSEast
    Argo --> EKSWest`,
        explanation: 'Active-Active compute layer with localized read access. Route 53 ARC shifts traffic dynamically in under 60 seconds if health checks fail. Storage uses Aurora Global Database with asynchronous storage-level block replication.',
        components: [
          { name: 'AWS Global Accelerator', technology: 'Anycast / Edge', purpose: 'Dual static IPs routing client traffic to optimal AWS edge PoP.' },
          { name: 'ArgoCD Multi-Cluster', technology: 'GitOps Engine', purpose: 'Synchronizes Kubernetes manifests across east and west simultaneously.' },
          { name: 'Aurora Global DB', technology: 'PostgreSQL Engine', purpose: 'Hardware-level storage replication with cross-region lag under 1 second.' },
        ],
        tradeoffs: [
          'Cross-region write routing incurs inter-region roundtrip latency; mitigated by caching read traffic at edge.',
          'State replication is asynchronous; split-brain risk managed strictly via Route 53 ARC health gates.',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sd-observability',
        title: 'Enterprise Observability & SRE Telemetry Stack',
        prompt: 'Design an observability platform handling 4 million metrics/sec and 500 GB logs/day across 200 nodes.',
        architectureType: 'observability',
        scaleRequirements: {
          qps: '4,000,000 metrics/sec / 500 GB logs/day',
          storage: 'S3 cold tier retention (1 year)',
          latency: 'Alert evaluation < 15s interval',
          availability: '99.95% monitoring uptime',
        },
        mermaidCode: `flowchart TD
    Nodes["200+ Kubernetes Nodes"] --> OTel["OpenTelemetry Collector DaemonSet"]
    OTel --> Prom["Prometheus Agent (Scraping)"]
    OTel --> Fluent["FluentBit (Log Shipper)"]

    subgraph MetricsTier ["Metrics Processing Tier"]
        Prom --> ThanosSidecar["Thanos Sidecar"]
        ThanosSidecar --> ThanosQuery["Thanos Query (Deduplication)"]
        ThanosSidecar --> S3Metrics[("Amazon S3 (Cold Metrics 1yr)")]
    end

    subgraph LogsTier ["Logs Processing Tier"]
        Fluent --> KafkaLogs["Kafka Topic (Raw Logs)"]
        KafkaLogs --> VectorEngine["Vector Transformer"]
        VectorEngine --> OpenSearch["OpenSearch Cluster (Hot 7 days)"]
        VectorEngine --> S3Logs[("S3 Glacier (Cold Logs Archive)")]
    end

    ThanosQuery --> Grafana["Grafana Dashboards"]
    OpenSearch --> Grafana
    ThanosQuery --> Alertmanager["Prometheus Alertmanager"]
    Alertmanager --> PagerDuty["PagerDuty / Slack Alerts"]`,
        explanation: 'Separates hot metrics and cold storage via Thanos Sidecars writing parquet/block formats to S3. OpenTelemetry DaemonSets standardize OTLP spans and logs before batching to Kafka.',
        components: [
          { name: 'OpenTelemetry Collector', technology: 'OTel DaemonSet', purpose: 'Uniform ingestion for traces, logs, and Prometheus metrics.' },
          { name: 'Thanos Query', technology: 'Thanos Multi-Store', purpose: 'Global view and deduplication of Prometheus metrics across clusters.' },
          { name: 'Kafka Ingestion Buffer', technology: 'Apache Kafka', purpose: 'Absorbs log spikes during production incidents without dropping data.' },
        ],
        tradeoffs: [
          'OpenSearch index retention capped at 7 days for cost containment; older logs queried on-demand via Athena from S3.',
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Generate Custom System Design on Demand
   */
  generateSystemDesign(prompt: string): SystemDesignDiagram {
    const lower = prompt.toLowerCase();
    
    // Check if URL shortener requested
    if (lower.includes('url') || lower.includes('tinyurl') || lower.includes('bitly')) {
      return {
        id: `sd-${Date.now()}`,
        title: 'Distributed High-Throughput URL Shortener',
        prompt,
        architectureType: 'microservices',
        scaleRequirements: {
          qps: '100,000 read QPS / 10,000 write QPS',
          storage: '6 TB Cassandra (Key-Value)',
          latency: 'p99 redirect < 15ms',
          availability: '99.999%',
        },
        mermaidCode: `flowchart TD
    User["Client Browser"] --> CDN["Cloudflare CDN (Edge Redirects)"]
    CDN --> LB["Load Balancer"]
    LB --> KGS["Key Generation Service (Base62)"]
    LB --> ReadSvc["Redirect Query Service"]

    KGS --> ZK["Apache ZooKeeper (Token Ranges)"]
    KGS --> DBWrite[("ScyllaDB / Cassandra (ShortURL Table)")]
    
    ReadSvc --> Memcached["Memcached Cluster (Top 20% URLs)"]
    Memcached -. Cache Miss .-> DBWrite
    DBWrite --> Analytics["Kafka (Clickstream Telemetry)"]`,
        explanation: 'Generates Base62 7-character hashes via pre-allocated ZooKeeper token ranges, eliminating database lock contention during concurrent write requests. Reads are served 80%+ from edge CDN and distributed Memcached.',
        components: [
          { name: 'Key Generation Service', technology: 'ZooKeeper + Go', purpose: 'Pre-allocates 100,000 token blocks to prevent collision overhead.' },
          { name: 'Cache Layer', technology: 'Memcached', purpose: 'Sub-millisecond lookup for popular 80/20 power law URLs.' },
          { name: 'Storage Engine', technology: 'Cassandra / ScyllaDB', purpose: 'LSM-tree write optimization and horizontal multi-master scaling.' },
        ],
        tradeoffs: [
          'Custom short URLs require synchronous validation check vs pre-computed token pipeline.',
          'Eventual consistency on click analytics to maintain ultra-fast redirect speed.',
        ],
        createdAt: new Date().toISOString(),
      };
    }

    // Default high-availability microservices architecture
    return {
      id: `sd-${Date.now()}`,
      title: `System Architecture: ${prompt.slice(0, 40)}`,
      prompt,
      architectureType: 'microservices',
      scaleRequirements: {
        qps: '35,000 QPS Peak',
        storage: '8 TB Distributed Storage',
        latency: 'p99 < 120ms',
        availability: '99.99% Multi-AZ',
      },
      mermaidCode: `flowchart TD
    Client["Client Clients / External Apps"] --> Cloudflare["Cloudflare CDN & DDoS Protection"]
    Cloudflare --> ALB["AWS Application Load Balancer"]
    ALB --> Gateway["API Gateway / Reverse Proxy"]

    subgraph CorePlatform ["Kubernetes EKS Core Workloads"]
        Gateway --> CoreService["Core Application Service"]
        Gateway --> ProcessingService["Async Processing Service"]
        CoreService --> EventQueue["RabbitMQ / Kafka Broker"]
    end

    CoreService --> RedisCache["Redis In-Memory Cache"]
    CoreService --> PrimaryDB[("PostgreSQL Aurora Primary")]
    PrimaryDB -. Streaming Replication .-> ReplicaDB[("Aurora Read Replica")]
    EventQueue --> WorkerPods["Background Worker Pool"]
    WorkerPods --> S3Storage[("AWS S3 Object Storage")]`,
      explanation: `Robust decoupled architecture addressing: "${prompt}". Ingress traffic is filtered at edge CDN, routed through AWS ALB to Kubernetes microservices, with Redis caching query hot paths and Kafka handling asynchronous worker tasks.`,
      components: [
        { name: 'Ingress Controller', technology: 'ALB + Envoy', purpose: 'SSL termination, path-based routing, and rate limiting.' },
        { name: 'Worker Cluster', technology: 'Kubernetes Karpenter', purpose: 'Elastic compute scaling based on message queue depth.' },
        { name: 'Relational Tier', technology: 'Amazon Aurora', purpose: 'ACID transactional consistency with cross-AZ automated failover.' },
      ],
      tradeoffs: [
        'Queue-based decoupling introduces asynchronous processing latency for long-running workflows.',
        'Read replica replication lag requires sticky sessions for immediate write-after-read scenarios.',
      ],
      createdAt: new Date().toISOString(),
    };
  }
}

export const systemDesignService = new SystemDesignService();
