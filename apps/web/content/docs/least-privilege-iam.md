# Least-Privilege IAM Policy Generator

Configuring IAM deployment permissions for CI/CD runners (like GitHub Actions) is one of the most frustrating parts of AWS engineering:
- Granting `AdministratorAccess` violates compliance standards (HIPAA, SOC2, ISO27001).
- Crafting policies by hand leads to hours of trial-and-error `403 AccessDenied` errors.

Syncploy solves this with the `syncploy policy` command.

---

## How It Works

Because Syncploy compiles your TypeScript application into an exact CloudFormation template, it knows **every single AWS action and resource ARN** your deployment will ever touch.

```bash
syncploy policy . -s ehr-annotation-backend -o deploy-policy.json
```

---

## Key Synthesis Features

1. **Dead Service Pruning**: If your code doesn't use API Gateway or CloudFront, permissions for those services are never generated.
2. **Strict ARN Scoping**: Scopes resource permissions down to your exact account, region, and stack name (`arn:aws:cognito-idp:ap-south-1:<ACCOUNT_ID>:userpool/*`).
3. **Shadow Action Resolution**: Injects all CloudFormation background actions (such as `cognito-idp:TagResource`, `s3:PutBucketPolicy`) that AWS requires CloudFormation to invoke under the hood.

---

## Example Generated Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CognitoUserPoolManagement",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:CreateUserPool",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:TagResource",
        "cognito-idp:ListTagsForResource"
      ],
      "Resource": "arn:aws:cognito-idp:ap-south-1:<ACCOUNT_ID>:userpool/*"
    }
  ]
}
```
