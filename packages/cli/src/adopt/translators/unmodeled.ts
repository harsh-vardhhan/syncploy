export const KNOWN_RESOURCE_TYPES = new Set([
  "AWS::DynamoDB::Table",
  "AWS::S3::Bucket",
  "AWS::SQS::Queue",
  "AWS::SNS::Topic",
  "AWS::KinesisFirehose::DeliveryStream",
  "AWS::CloudWatch::Alarm",
  "AWS::Cognito::UserPool",
  "AWS::Cognito::UserPoolClient",
  "AWS::Serverless::Function",
  "AWS::Lambda::Function",
  // Auto-synthesized by Syncploy:
  "AWS::IAM::Role",
  "AWS::Events::Rule",
  "AWS::SQS::QueuePolicy",
  "AWS::Lambda::Permission",
  "AWS::Lambda::EventSourceMapping",
  "AWS::Lambda::Url",
  "AWS::SNS::Subscription",
]);

export function extractUnmodeledResources(resources: Record<string, any>): string[] {
  const unmodeled: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (!KNOWN_RESOURCE_TYPES.has(res.Type)) {
      unmodeled.push(`${key} (${res.Type})`);
    }
  }
  return unmodeled;
}
