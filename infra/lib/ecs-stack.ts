import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcsStack extends cdk.Stack {
    public readonly fargateService: ecs.FargateService;
    public readonly ecrRepo: ecr.Repository;
    public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    public readonly targetGroupBlue: elbv2.ApplicationTargetGroup;
    public readonly targetGroupGreen: elbv2.ApplicationTargetGroup;
    public readonly containerName: string;
    public readonly containerPort: number;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.containerName = 'app-container';
        this.containerPort = 80;

        // vpc
        const vpc = new ec2.Vpc(this, 'AppVpc', {
            maxAzs: 2,
            natGateways: 1,
        });

        // ecs cluster
        const cluster = new ecs.Cluster(this, 'AppCluster', {
            vpc: vpc,
            clusterName: 'ha-cluster',
        });

        // ecr repository
        this.ecrRepo = new ecr.Repository(this, 'AppRepo', {
            repositoryName: 'ha-app-repo',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // application load balancer
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'AppALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: 'ha-alb',
        });

        const prodListener = this.loadBalancer.addListener('ProdListener', {
            port: 80,
        });

        const testListener = this.loadBalancer.addListener('TestListener', {
            port: 8080,
        });

        // target groups
        this.targetGroupBlue = new elbv2.ApplicationTargetGroup(this, 'BlueGroup', {
            vpc,
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/health',
                interval: cdk.Duration.seconds(30),
            },
        });

        this.targetGroupGreen = new elbv2.ApplicationTargetGroup(this, 'GreenGroup', {
            vpc,
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/health',
                interval: cdk.Duration.seconds(30),
            },
        });

        prodListener.addTargetGroups('ProdTargets', {
            targetGroups: [this.targetGroupBlue],
        });

        testListener.addTargetGroups('TestTargets', {
            targetGroups: [this.targetGroupGreen],
        });

        // fargate task definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'AppTaskDef', {
            memoryLimitMiB: 512,
            cpu: 256,
        });

        taskDefinition.addContainer(this.containerName, {
            image: ecs.ContainerImage.fromEcrRepository(this.ecrRepo, 'latest'),
            portMappings: [{ containerPort: this.containerPort }],
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ha-app' }),
        });

        // fargate service
        this.fargateService = new ecs.FargateService(this, 'AppService', {
            cluster,
            taskDefinition,
            deploymentController: {
                type: ecs.DeploymentControllerType.CODE_DEPLOY,
            },
            desiredCount: 2,
        });

        // attach service to blue target group
        this.fargateService.attachToApplicationTargetGroup(this.targetGroupBlue);

        // output
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: this.loadBalancer.loadBalancerDnsName,
        });
    }
}
