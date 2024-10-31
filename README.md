# bedrock-chat-app

```
With the arise of LLMs, the value of 90% of my skills is zero, the value of the remaining 10% is 100X.
```

I didn't write a single line of code in this repo, nor did I conduct a single Google search. I used an LLM to generate all the code. My role involved prompting the LLM, followed by a lot of copying, pasting, testing, and debugging. I used VS Code with the Amazon Q extension and the Developer Free Tier version of Amazon Q.

The goal of this repo was to experiment with using an LLM to build an app and to share what I learned.

First things first, here is a description of the Bedrock Chat App. It is a web app similar to ChatGPT, but it can use any LLM available in AWS Bedrock.

The user interface is a React web app, with a simple input box at the bottom and a larger box at the top displaying the conversation with the LLM. By default it works in session mode and sends all previous turnarounds with the LLM. There is a clear button to start a new session if you want to change topics. For simplicity, this is a static web app served from an AWS S3 bucket.

The web app connects to an AWS Lambda via HTTPS. The Lambda function is a proxy between the web app and AWS Bedrock. It calls the Bedrock API and, in this repo, routes the user request to Anthropic Claude 3 Haiku LLM. You can change the model in /lambda/src/index.js, and I will probably add more code in the future to make it configuration-driven.

Full disclosure: I have good knowledge of all the technologies used in this app (React, AWS Lambda, AWS SDK Node, AWS Bedrock) - I have other repos under this same account that use them. This type of knowledge is very useful but the LLM can help you make choices if you know what you want.

Before going into more details, the most important lesson learned is to be as concrete and precise as you can when asking the LLM. The more vague you are in your prompt, the bigger the risk that the LLM can misguide you. On the other hand, the LLM is great at answering good questions. As a bonus, Amazon Q is aware of your repo and files, so constant referencing isn't needed. But if you are looking at something specific to a file, don't hesitate to name it in your prompt.

It is true that LLMs hallucinate, but honestly, it has been almost trivial to notice it, and a follow-up clarifying question provides the right answer. I had only one instance where the LLM misguided me, more on that later.

This is the process I followed when creating the app:

I explained to the LLM the app I wanted to build and asked it to build a simple React app. It recommended to use create-react-app and created a script to build all the scaffolding. I asked to use containers to minimize the need to install anything in my VM (I was using an EC2 instance and connecting remotely using VS Code). I ended up in minutes with a simple app that I could run from EC2. As a bonus, it added instructions on how to tunnel a port to access the app from my laptop.

I asked Amazon Q to add an input box, conversation box, and a send button to the app. A little bit of copy and paste and the user interface was done.

Next, I asked the LLM to move the web app to S3, and it indicated me the steps to do it in the AWS console. I indicated I preferred to use AWS SDK for Node.js and it wrote most of deploy-s3.js. I did a deployment but I got a 'forbidden' answer when trying to access the app from my browser. I asked the LLM why I was receiving a forbidden reply, and it added the code to allow public access. LLMs are great at fixing problems based on the error output.

I then asked to create a Lambda function to connect to AWS Bedrock. The LLM wrote the code for the Lambda function (index.js) and upon my request deploy-lambda.js to deploy the lambda. 

I asked for options to make the Lambda function available over the internet. Previously, I used API Gateway, which the LLM also included as an option, but it suggested Lambda Function URLs, which were unknown to me. I ended up using them due to their simplicity, and the LLM added the code to deploy_lambda.js.

Next I wanted to test the lambda and verify that it worked before even call it from the web app. I had issues testing the Lambda function from the AWS console. I asked the LLM to add logging to the Lambda, which it added with great detail (but not too much). I also asked the LLM to create automated tests and synthetic data for the tests. You can see the results in lambda/test/lambda.test.js and it also produced the code to call the tests. I moved the tests to a new test folder and indicated to  the LLM this change; it changed references in lambda.test.js accordingly.

Finally I asked to create a delete_lambda.js to reverse all the changes done in deploy_lambda.js and a delete-S3.js to remove the web app, which it did to perfection. Throughout this process, I had several issues deploying and deleting all the code. Any time I had an error, I indicated to the LLM the file where the error happened and literally copied the error output. Most of the time, the LLM was able to fix the issue in the code. In other cases, it suggested a change that could help learn more about what was happening.

One interesting error case was related to the LLM model. The original code written by Amazon Q called Claude 2. I noted in the AWS console that Claude 3 was available, so I asked for access permission and changed the code to point to Claude 3 Haiku. When testing the code it raised an error, it turned our that Claude 3 uses a new MessagesAPI. I prompted Amazon Q with the error and it corrected it on the spot. Considering that Claude 3 was released this March, Amazon Q has mechanisms to stay up to date :-)

The final step was to connect the web app to the Lambda function. I asked the LLM to call the lambda when the user clicks 'Send' on the web app. It wrote the changes needed in the web app. The code changes were in the right place and looked very good. Unfortunately, they didn't work. SetMessages is an async function, and using the result immediately after invoking the function is a recipe for failure. I indicated this to the LLM, and it offered a complicated solution nesting function calls. It didn't work either. After a little back and forth, we ended up with a simpler solution, which was to create an object with the data needed to call the Lambda (chat.js ln 34). This was the case where I lost time using the LLM, but fortunately, my knowledge saved the day. As part of this debugging, I asked the LLM to add logging to the web app to use it with Chrome Dev Tools.

With everything up and running, I asked the LLM about the best way to document deploy-lambda.js and my interest to use automated tools for documentation. It recommended JSDoc and generated code to use it. I asked to document deploy-lambda.js and it generated all the in-file documentation. You can see the final result in the docs folder. 

Finally, I wanted to experiment with refactoring. I explained to the LLM that I was an enthusiast of object-oriented programming and asked it to refactor deploy-lambda.js using OOP principles. It didn't come out well. The code it produced followed OOP patterns but missed many of the functionalities in the module. I ended up with a sense that my request was vague and that I needed to be more specific and probably refactor in small steps. This is an area I will continue experimenting with.

**Summary**

LLMs are a great companion for software development:

1. Automate tedious tasks like documentation, logging, and testing.
2. Correct most errors efficiently.
3. Handle edge cases in the code.
4. Explain code effectively.
5. With the right prompt, they produce good-quality pieces of code.

My experiment with LLMs allowed me to focus more on architecture, design, and project structure instead of nitty-gritty sintax details. It skyrocketed my productivity. Still, it is a companion and will go as far as you can guide it.

**Update on 10/30/24**

I added a config.json file and extracted most constants to this file. Here are some of the prompts I used:
- I would like to move most constants to a config file so they are easier to manage. is there a package that can help?
- I would prefer to use a json object to save my configs. any suggestion?
- can you create code to move function_name and role_name constants in deploy-lambda.js to a config.json file at the root of the repo?
- can you do the same for deploy-s3.js?
- anything else that you suggest to move to the config.json file?
- how can i add temperature when invoking bedrock's models?
- is the JSDoc documentation in deploy-lambda.js up to date?
