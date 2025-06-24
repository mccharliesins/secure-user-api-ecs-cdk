import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcsStack extends cdk.Stack {
    public readonly ecrRepo: ecr.Repository;
    public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'AppVpc', { maxAzs: 2, natGateways: 1 });
        const cluster = new ecs.Cluster(this, 'AppCluster', { vpc, clusterName: 'ha-cluster' });

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
    }
}
