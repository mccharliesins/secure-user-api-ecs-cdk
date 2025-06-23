import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcsStack extends cdk.Stack {
    public readonly ecrRepo: ecr.Repository;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

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
    }
}
