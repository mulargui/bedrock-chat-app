const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const fs = require("fs");
const path = require('path');

// Read the config file
const configPath = path.join(__dirname, 'config.json');
const rawConfig = fs.readFileSync(configPath);
const config = JSON.parse(rawConfig);

const REGION = process.env.AWS_REGION || "us-east-1";
const bedrockClient = new BedrockRuntimeClient({ region: REGION });

// helper function to support retries
async function invokeBedrockWithRetry(params, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const command = new InvokeModelCommand(params);
      return await bedrockClient.send(command);
    } catch (error) {
      if (error.name === 'ThrottlingException' && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 100; // exponential backoff
        console.log("Invoking Bedrock ThrottlingException, waiting:", delay);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

exports.handler = async (event) => {
    console.log("Lambda function invoked with event:", JSON.stringify(event, null, 2));
    console.log("Parsed config:", JSON.stringify(config, null, 2));

    try {
        // Extract the message from the event
        //const messages = [{ "role": 'user', "content": "which is the capital of Paris?"}];
        const body = JSON.parse(event.body);
        console.log("Raw response body:", JSON.stringify(body, null, 2));
        const messages = body.messages || [];
        console.log("Raw response messages:", JSON.stringify(messages, null, 2));
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error("Invalid input: Messages should be a non-empty array");
        }
        const max_tokens = body.max_tokens || config.bedrock.maxTokens || 300;
        const temperature = body.temperature || config.bedrock.temperature || 1.0;

        // Prepare the request for Bedrock
        console.log("Initializing Bedrock client");
        const params = {
            modelId: config.bedrock.model,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: config.bedrock.anthropic_version,
                max_tokens: max_tokens,
                temperature: temperature,
                messages: messages
            })
        };

        // Invoke Bedrock model
        console.log("Preparing to invoke Bedrock model with params:", JSON.stringify(params, null, 2));

        //const command = new InvokeModelCommand(params);
        //const response = await bedrockClient.send(command);
        const response = await invokeBedrockWithRetry(params);

        console.log("Received response from Bedrock:", JSON.stringify(response, null, 2));

        // Parse the response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        console.log("Parsed response body:", JSON.stringify(responseBody, null, 2));
        const answer = responseBody.content[0].text;
        console.log("Parsed answer:", answer);

        // Add the assistant's response to the conversation history
        messages.push({ role: "assistant", content: answer });

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                answer: answer,
                conversation: messages  // Return the updated conversation history
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        console.error("Error occurred:", error);
        console.error("Error stack:", error.stack);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        
        if (error.$metadata) {
            console.error("Error metadata:", JSON.stringify(error.$metadata, null, 2));
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred processing your request' }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
