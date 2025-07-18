# High-Availability Microservice (ECS Fargate + Blue/Green Deployment)

## Overview

This project demonstrates a **production-grade** deployment architecture for a microservice on AWS. It uses **Amazon ECS (Fargate)** for serverless container management and implements a **Blue/Green Deployment Strategy** (via AWS CodeDeploy) to ensure zero-downtime updates.

The infrastructure is defined entirely as code using **AWS CDK** (Cloud Development Kit).

### Architecture Highlights

*   **Compute**: AWS Fargate (Serverless Containers).
*   **Orchestration**: Amazon ECS.
*   **Load Balancing**: Application Load Balancer (ALB) with separate listeners for Production (80) and Test (8080) traffic.
*   **CI/CD**: AWS CodePipeline triggering AWS CodeBuild (for Docker builds) and AWS CodeDeploy (for traffic shifting).
*   **Deployment Strategy**: Blue/Green (Canary 10% for 5 minutes).

## Blue/Green Deployment Strategy Explained

This project creates two Target Groups: **Blue** and **Green**.

1.  **Steady State**: Traffic flows to the "Blue" target group (Port 80).
2.  **Deployment Trigger**: A code change is pushed to the repository.
3.  **Build Phase**: CodeBuild builds a new Docker image and pushes it to ECR.
4.  **Replacement Task Set**: CodeDeploy spins up a new replacement task set (Green) in parallel with the production set (Blue).
5.  **Test Traffic**: The new tasks are registered to the **Test Listener** (Port 8080). You can verify the new version via this port before any production traffic is shifted.
6.  **Traffic Shifting (Canary)**: 
    *   CodeDeploy shifts 10% of live traffic to the Green group.
    *   It waits 5 minutes to monitor health.
    *   If healthy, it shifts the remaining 90%.
7.  **Termination**: After a successful shift, the old (Blue) tasks are terminated.

## Setup Instructions

### Prerequisites
*   Node.js & npm
*   Docker running locally
*   AWS CLI configured
*   AWS CDK installed (`npm install -g aws-cdk`)

### 1. Install Dependencies
```bash
cd app && npm install
cd ../infra && npm install
```

### 2. Configure Source
Update `infra/lib/pipeline-stack.ts` with your GitHub details:
```typescript
owner: 'your-github-username',
repo: 'your-repo-name',
branch: 'main',
oauthToken: cdk.SecretValue.secretsManager('my-github-token')
```

### 3. Deploy Infrastructure
```bash
cd infra
cdk bootstrap # run once per region
cdk deploy --all
```

### 4. Verify Deployment
*   Go to the CloudFormation inputs or ECS Console to find your **LoadBalancerDNS**.
*   Access the API: `curl http://<LoadBalancerDNS>/`
*   Run the load test script: `./scripts/load-test.sh http://<LoadBalancerDNS>/`

## License
MIT
