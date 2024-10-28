/**
 * @fileoverview Lambda deployment script for the Bedrock demo app.
 * This module handles the creation of IAM roles, deployment of Lambda functions,
 * configuration updates, and creation of function URLs.
 * @module deploy-lambda
 */

const { 
  LambdaClient, 
  CreateFunctionCommand, 
  UpdateFunctionCodeCommand,
  CreateFunctionUrlConfigCommand,
  UpdateFunctionUrlConfigCommand,
  GetFunctionUrlConfigCommand,
  AddPermissionCommand
} = require("@aws-sdk/client-lambda");
const { IAMClient, GetRoleCommand, CreateRoleCommand, AttachRolePolicyCommand } = require("@aws-sdk/client-iam");
const AdmZip = require("adm-zip");
const fs = require("fs");
const util = require('util');
const writeFileAsync = util.promisify(fs.writeFile);

const FUNCTION_NAME = "bedrock-chat-lambda";
const ROLE_NAME = "bedrock-chat-lambda-role";
const REGION = process.env.AWS_REGION || "us-east-1";

const lambda = new LambdaClient({ region: REGION });
const iam = new IAMClient({ region: REGION });

/**
 * Creates an IAM role for the Lambda function.
 * @returns {Promise<string>} The ARN of the created or existing role.
 * @throws {Error} If role creation fails.
 */
async function createLambdaRole() {
  const rolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "lambda.amazonaws.com"
        },
        Action: "sts:AssumeRole"
      }
    ]
  };

  try {
    const getRoleCommand = new GetRoleCommand({ RoleName: ROLE_NAME });
    const { Role } = await iam.send(getRoleCommand);
    return Role.Arn;
  } catch (error) {
    if (error.name === "NoSuchEntityException") {
      const createRoleCommand = new CreateRoleCommand({
        RoleName: ROLE_NAME,
        AssumeRolePolicyDocument: JSON.stringify(rolePolicy)
      });
      const { Role } = await iam.send(createRoleCommand);

      await attachPolicies(ROLE_NAME);

      // Wait for the role to be available
      await new Promise(resolve => setTimeout(resolve, 10000));

      return Role.Arn;
    }
    throw error;
  }
}

/**
 * Attaches necessary policies to the IAM role.
 * @param {string} roleName - The name of the IAM role.
 * @returns {Promise<void>}
 */
async function attachPolicies(roleName) {
  await iam.send(new AttachRolePolicyCommand({
    RoleName: roleName,
    PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  }));

  await iam.send(new AttachRolePolicyCommand({
    RoleName: roleName,
    PolicyArn: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
  }));
}

/**
 * Creates or updates the function URL for the Lambda.
 * @param {string} functionName - The name of the Lambda function.
 * @returns {Promise<void>}
 * @throws {Error} If function URL creation or update fails.
 */
async function createFunctionUrl(functionName) {
  try {
    // Check if function URL already exists
    const getFunctionUrlCommand = new GetFunctionUrlConfigCommand({ FunctionName: functionName });
    await lambda.send(getFunctionUrlCommand);
    
    // If it exists, update it
    const updateFunctionUrlCommand = new UpdateFunctionUrlConfigCommand({
      FunctionName: functionName,
      AuthType: "NONE",
      Cors: {
        AllowCredentials: true,
        AllowHeaders: ["*"],
        AllowMethods: ["*"],
        AllowOrigins: ["*"],
        ExposeHeaders: ["*"],
        MaxAge: 86400
      }
    });
    const response = await lambda.send(updateFunctionUrlCommand);
    console.log("Function URL updated:", response.FunctionUrl);
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      // If it doesn't exist, create it
      const createFunctionUrlCommand = new CreateFunctionUrlConfigCommand({
        FunctionName: functionName,
        AuthType: "NONE",
        Cors: {
          AllowCredentials: true,
          AllowHeaders: ["*"],
          AllowMethods: ["*"],
          AllowOrigins: ["*"],
          ExposeHeaders: ["*"],
          MaxAge: 86400
        }
      });
      const response = await lambda.send(createFunctionUrlCommand);
      console.log("Function URL created:", response.FunctionUrl);
    } else {
      throw error;
    }
  }

  // Add permission for public access
  await addFunctionUrlPermission(functionName);
}

/**
 * Adds permission for public access to the function URL.
 * @param {string} functionName - The name of the Lambda function.
 * @returns {Promise<void>}
 * @throws {Error} If adding permission fails.
 */
async function addFunctionUrlPermission(functionName) {
  try {
    const addPermissionCommand = new AddPermissionCommand({
      FunctionName: functionName,
      StatementId: "FunctionURLAllowPublicAccess",
      Action: "lambda:InvokeFunctionUrl",
      Principal: "*",
      FunctionUrlAuthType: "NONE"
    });

    await lambda.send(addPermissionCommand);
    console.log("Function URL public access permission added successfully");
  } catch (error) {
    if (error.name === "ResourceConflictException") {
      console.log("Function URL permission already exists");
    } else {
      throw error;
    }
  }
}

/**
 * Saves the function URL to a config file.
 * @param {string} functionName - The name of the Lambda function.
 * @returns {Promise<void>}
 * @throws {Error} If saving the config fails.
 */
async function SaveUrlInConfigFile(functionName) {
  const command = new GetFunctionUrlConfigCommand({ FunctionName: functionName });

  try {
    const response = await lambda.send(command);

    // Save the function URL to config.json
    const config = { LAMBDA_FUNCTION_URL: response.FunctionUrl };

    await writeFileAsync('config.json', JSON.stringify(config, null, 2));
    console.log(`Config file updated at config.json`);

  } catch (error) {
    console.error('Error creating and saving config:', error);
    throw error;
  }
}

/**
 * Deploys the Lambda function.
 * @returns {Promise<void>}
 * @throws {Error} If deployment fails.
 */
async function deployLambda() {
  const zip = new AdmZip();
  zip.addLocalFolder("./src");
  const zipBuffer = zip.toBuffer();

  const roleArn = await createLambdaRole();

  try {
    const createFunctionCommand = new CreateFunctionCommand({
      FunctionName: FUNCTION_NAME,
      Runtime: "nodejs18.x",
      Role: roleArn,
      Handler: "index.handler",
      Code: { ZipFile: zipBuffer },
      Timeout: 30,
      MemorySize: 128
    });

    await lambda.send(createFunctionCommand);
    console.log("Lambda function created successfully");
  } catch (error) {
    if (error.name === "ResourceConflictException") {
      console.log("Lambda function already exists. Updating code...");
      const updateFunctionCodeCommand = new UpdateFunctionCodeCommand({
        FunctionName: FUNCTION_NAME,
        ZipFile: zipBuffer
      });
      await lambda.send(updateFunctionCodeCommand);
      console.log("Lambda function code updated successfully");
    } else {
      throw error;
    }
  }

  // Create or update function URL
  await createFunctionUrl(FUNCTION_NAME);
  await SaveUrlInConfigFile(FUNCTION_NAME);
}

deployLambda().catch(console.error);
