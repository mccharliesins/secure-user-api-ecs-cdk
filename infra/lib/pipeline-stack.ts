import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface PipelineStackProps extends cdk.StackProps {
    fargateService: ecs.FargateService;
    ecrRepo: ecr.Repository;
    loadBalancer: elbv2.ApplicationLoadBalancer;
    targetGroupBlue: elbv2.ApplicationTargetGroup;
    targetGroupGreen: elbv2.ApplicationTargetGroup;
    containerName: string;
    containerPort: number;
}

export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);

        // source artifact
        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();

        // build project
        const buildProject = new codebuild.PipelineProject(this, 'AppBuildProject', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true,
            },
            environmentVariables: {
                REPOSITORY_URI: { value: props.ecrRepo.repositoryUri },
                CONTAINER_NAME: { value: props.containerName },
                CONTAINER_PORT: { value: props.containerPort.toString() },
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename('infra/buildspec.yml'),
        });

        props.ecrRepo.grantPullPush(buildProject);

        // codedeploy application
        const ecsApplication = new codedeploy.EcsApplication(this, 'EcsApp', {
            applicationName: 'ha-ecs-app',
        });

        const ecsDeploymentGroup = new codedeploy.EcsDeploymentGroup(this, 'EcsDeployGroup', {
            application: ecsApplication,
            service: props.fargateService,
            blueGreenDeploymentConfig: {
                blueTargetGroup: props.targetGroupBlue,
                greenTargetGroup: props.targetGroupGreen,
                listener: props.loadBalancer.listeners.find(l => l.node.id === 'ProdListener')!,
                testListener: props.loadBalancer.listeners.find(l => l.node.id === 'TestListener')!,
                deploymentApprovalWaitTime: cdk.Duration.minutes(10),
                terminationWaitTime: cdk.Duration.minutes(5),
            },
            deploymentConfig: codedeploy.EcsDeploymentConfig.CANARY_10PERCENT_5MINUTES,
        });

        // pipeline
        new codepipeline.Pipeline(this, 'AppPipeline', {
            pipelineName: 'ha-api-pipeline',
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new codepipeline_actions.GitHubSourceAction({
                            actionName: 'GitHub_Source',
                            owner: 'my-github-user',
                            repo: 'my-repo-name',
                            oauthToken: cdk.SecretValue.secretsManager('my-github-token'),
                            output: sourceOutput,
                            branch: 'main',
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Docker_Build',
                            project: buildProject,
                            input: sourceOutput,
                            outputs: [buildOutput],
                        }),
                    ],
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        new codepipeline_actions.CodeDeployEcsDeployAction({
                            actionName: 'BlueGreen_Deploy',
                            deploymentGroup: ecsDeploymentGroup,
                            appSpecTemplateInput: buildOutput,
                            taskDefinitionTemplateInput: buildOutput,
                            containerImageInputs: [
                                {
                                    input: buildOutput,
                                    taskDefinitionPlaceholder: 'IMAGE1_NAME',
                                }
                            ]
                        }),
                    ],
                },
            ],
        });
    }
}
