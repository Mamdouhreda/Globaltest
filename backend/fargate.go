package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ecs"
	"github.com/aws/aws-sdk-go-v2/service/ecs/types"
)

// regionConfig holds everything RunTask needs for one GlobalTest testing
// region. Values are read from environment variables rather than hardcoded,
// since they only exist once `terraform apply` has created the
// infrastructure — see terraform/outputs.tf for where these values come from.
type regionConfig struct {
	awsRegion         string
	clusterARN        string
	subnetIDs         []string
	securityGroupID   string
	taskDefinitionARN string
}

const browserTesterContainerName = "browser-tester"

// loadRegionConfigs reads per-region Fargate settings from environment
// variables, one set per supported testing region.
func loadRegionConfigs() map[string]regionConfig {
	regions := []string{"uk", "us", "germany"}
	configs := make(map[string]regionConfig, len(regions))

	for _, region := range regions {
		prefix := "FARGATE_" + strings.ToUpper(region) + "_"
		configs[region] = regionConfig{
			awsRegion:         os.Getenv(prefix + "AWS_REGION"),
			clusterARN:        os.Getenv(prefix + "CLUSTER_ARN"),
			subnetIDs:         splitCommaList(os.Getenv(prefix + "SUBNET_IDS")),
			securityGroupID:   os.Getenv(prefix + "SECURITY_GROUP_ID"),
			taskDefinitionARN: os.Getenv(prefix + "TASK_DEFINITION_ARN"),
		}
	}

	return configs
}

func splitCommaList(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	for i, part := range parts {
		parts[i] = strings.TrimSpace(part)
	}
	return parts
}

// runBrowserTestTask launches one on-demand Fargate task that runs the
// browser-tester container against targetURL in the given region. It
// returns the started task's ARN without waiting for the task to finish.
func runBrowserTestTask(ctx context.Context, cfg regionConfig, targetURL, testID string) (string, error) {
	awsCfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(cfg.awsRegion))
	if err != nil {
		return "", fmt.Errorf("load AWS config: %w", err)
	}

	client := ecs.NewFromConfig(awsCfg)

	output, err := client.RunTask(ctx, &ecs.RunTaskInput{
		Cluster:        aws.String(cfg.clusterARN),
		TaskDefinition: aws.String(cfg.taskDefinitionARN),
		LaunchType:     types.LaunchTypeFargate,
		Count:          aws.Int32(1),
		NetworkConfiguration: &types.NetworkConfiguration{
			AwsvpcConfiguration: &types.AwsVpcConfiguration{
				Subnets:        cfg.subnetIDs,
				SecurityGroups: []string{cfg.securityGroupID},
				AssignPublicIp: types.AssignPublicIpEnabled,
			},
		},
		Overrides: &types.TaskOverride{
			ContainerOverrides: []types.ContainerOverride{
				{
					Name: aws.String(browserTesterContainerName),
					Environment: []types.KeyValuePair{
						{Name: aws.String("TARGET_URL"), Value: aws.String(targetURL)},
						{Name: aws.String("TEST_ID"), Value: aws.String(testID)},
						{Name: aws.String("RESULTS_BUCKET"), Value: aws.String(os.Getenv("RESULTS_BUCKET"))},
						{Name: aws.String("RESULTS_BUCKET_REGION"), Value: aws.String(os.Getenv("RESULTS_BUCKET_REGION"))},
					},
				},
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("run fargate task: %w", err)
	}

	if len(output.Failures) > 0 {
		return "", fmt.Errorf("fargate task failed to start: %s", aws.ToString(output.Failures[0].Reason))
	}
	if len(output.Tasks) == 0 {
		return "", fmt.Errorf("fargate RunTask returned no tasks")
	}

	return aws.ToString(output.Tasks[0].TaskArn), nil
}
