#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsStack } from '../lib/ecs-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// ecs infrastructure
const ecsStack = new EcsStack(app, 'HighAvailabilityEcsStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

// pipeline infrastructure
new PipelineStack(app, 'HighAvailabilityPipelineStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    fargateService: ecsStack.fargateService,
    ecrRepo: ecsStack.ecrRepo,
    loadBalancer: ecsStack.loadBalancer,
    targetGroupBlue: ecsStack.targetGroupBlue,
    targetGroupGreen: ecsStack.targetGroupGreen,
    containerName: ecsStack.containerName,
    containerPort: ecsStack.containerPort,
});
