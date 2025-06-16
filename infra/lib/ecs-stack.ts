import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class EcsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // vpc
        const vpc = new ec2.Vpc(this, 'AppVpc', {
            maxAzs: 2,
            natGateways: 1,
        });
    }
}
