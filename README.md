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

**Update on 10/31/24**

Today I was receiving Throttling exceptions when invoking Bedrock. I asked Amazon Q with this prompt [1] and added code to retry. It turned out that AWS changed my quota to 0! (I googled online) I'm opening a ticket to AWS. This is how you can find your quotas to invoke a Bedrock model:
1. https://us-east-1.console.aws.amazon.com/servicequotas/home/services/bedrock/quotas
2. use this filter: "On-demand invokemodel requests per minute for anthro"

[1] @workspace 
whem invoking bedrock from the lambda I get the following error:\
2024-10-31T15:31:43.029Z	9e8ab552-9731-47a3-8795-b0719d14a1a6	ERROR	Error occurred: ThrottlingException: Too many requests, please wait before trying again. You have sent too many requests.  Wait before trying again.
    at de_ThrottlingExceptionRes (/var/task/node_modules/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js:1191:21)
    at de_CommandError (/var/task/node_modules/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js:1034:19)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /var/task/node_modules/@smithy/middleware-serde/dist-cjs/index.js:35:20
    at async /var/task/node_modules/@smithy/core/dist-cjs/index.js:168:18
    at async /var/task/node_modules/@smithy/middleware-retry/dist-cjs/index.js:320:38
    at async /var/task/node_modules/@aws-sdk/middleware-logger/dist-cjs/index.js:34:22
    at async exports.handler (/var/task/index.js:48:26) {
  '$fault': 'client',
  '$metadata': {
    httpStatusCode: 429,
    requestId: '93d032c2-4642-4c46-8cf3-fa456150593d',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 3,
    totalRetryDelay: 1010
  }
}

Till the issue is solved I worked a little bit in the UX. I did several styling changes and added a feedback loop with a thumbs up and a thumbs down buttons. Here are the prompts I used:

- @workspace 
In the front end app the send button is too close to the input box. How can I have the same space I have between buttons?

- I would like to add to the app a feedback loop. It will have a thumbs up and a thumbs down icons just below the messages box on the right side. can you write the code?

- implementing the code above I got this error when building the react app:\
Error building React app: Error: Command failed: npm run build\
    at genericNodeError (node:internal/errors:983:15)\
    at wrappedFn (node:internal/errors:537:14)\
    at ChildProcess.exithandler (node:child_process:419:12)\
    at ChildProcess.emit (node:events:518:28)\
    at maybeClose (node:internal/child_process:1104:16)\
    at ChildProcess._handle.onexit (node:internal/child_process:304:5) {\
  code: 1,\
  killed: false,\
  signal: null,\
  cmd: 'npm run build',\
  stdout: '\n' +
    '> src@0.1.0 build\n' +
    '> react-scripts build\n' +
    '\n' +
    'Creating an optimized production build...\n' +
    'Failed to compile.\n' +
    '\n' +
    "Module not found: Error: Can't resolve '@heroicons/react/solid' in '/src/src/components'\n" +
    '\n' +
    '\n',\
  stderr: ''
}
- how to install heroicons/react/solid?
- after installing heroicons I got this error. How can I import from v2?\
react-dom.production.min.js:188 Error: You're trying to import `@heroicons/react/solid/ThumbUpIcon` from Heroicons v1 but have installed Heroicons v2. Install `@heroicons/react@v1` to resolve this error.
    at Object.get (index.js:9:13)
    at Et (Chat.js:71:12)
    at go (react-dom.production.min.js:160:137)
    at Eu (react-dom.production.min.js:289:337)
    at bs (react-dom.production.min.js:279:389)
    at ys (react-dom.production.min.js:279:320)
    at gs (react-dom.production.min.js:279:180)
    at ls (react-dom.production.min.js:270:88)
    at as (react-dom.production.min.js:267:429)
    at S (scheduler.production.min.js:13:203)

- when building the app I got this error:\
Error building React app: Error: Command failed: npm run build\
    at genericNodeError (node:internal/errors:983:15)\
    at wrappedFn (node:internal/errors:537:14)\
    at ChildProcess.exithandler (node:child_process:419:12)\
    at ChildProcess.emit (node:events:518:28)\
    at maybeClose (node:internal/child_process:1104:16)\
    at ChildProcess._handle.onexit (node:internal/child_process:304:5) {
  code: 1,\
  killed: false,
  signal: null,
  cmd: 'npm run build',
  stdout: '\n' +
    '> src@0.1.0 build\n' +
    '> react-scripts build\n' +
    '\n' +
    'Creating an optimized production build...\n' +
    'Failed to compile.\n' +
    '\n' +
    "Attempted import error: 'ThumbUpIcon' is not exported from '@heroicons/react/24/solid' (imported as 'ThumbUpIcon').\n" +
    '\n' +
    '\n',
  stderr: ''
}

- when running the app the icons are not visible. I can click in the area and see the results in Chrome's dev tools but the icons are not visible.

- Now I can see the icons. now they have no border and black color. I would  rather like to have dark grey border and transparent color

- how can i remove the external circle?

- I want to have the icons smaller and with less space to the message box or input box. 

- can we have less space between the message box and the icons?

**Update on 11/1/24**

My ticket with AWS has resolved and have access to Claude 3 again. Nevertheless I was determined to make my app model independent so I can use other models. As always all the code is coming from Amazon Q. It added an abstraction layer to isolate the different payloads used by different models when using the AWS Bedrock API (I know, is not model independent). I tested the code using Claude 3 and Amazon Titan. Some of the tests didn't pass and I need to review them. They were built with Claude 3 and I need to make them model independent or add some logic to run some tests only dependent on the model to use.

Finally I added a small UX touch making the message box to scroll automatically to the end if the session is longer than the window.

This is becoming really fun and keep me focused on features instead of sintax details. My prompts today:

- @workspace
- I would like to use Amazon Titan Text Lite model instead of anthropic claude 3 haiku. what changes do i need to do?
- can you use javascript instead of python?
- why calling different bedrock models use different params or attributes?
- how can i add to lmbda/src/index.js an abstract layer that supports both anthropic and titan models?
- titan models doesn't support conversations but I can pass the whole history in the prompt. - can you modify the code to include history for titan models only?
- In chat.js I noticed the message box doesn't scroll when messages are longer than the box. can you add code to automatically scroll to the end of the last message?

**Second Update on 11/1/24**

There is a feature in Amazon Q using /dev before your prompt. It reviews your full project, creates the changes needed to fullfil your request and generates the changes. It tells you which files are changing, you can see the differences and finally approve the changes (or not). I tested it with the following prompt and worked well.
- /dev can you remove the black area at the top of the web app?

THe free tier only allows 3 uses of this feature, so I kept my remaining uses for the future.

Afterwards I worked in many small UX changes, most of them CSS. It ended up being a little bit messy, which is not uncommon with CSS. At some point I felt it was overcomplicated and difficult to change so I rolled back the changes and applied a few of them selectively. I ended up with what I wanted with very few CSS changes. Amazon Q has a tendency to overcomplicate CSS changes.

Here are the prompts I used:

- how can i make the header transparent?
- how can i make the header smaller and use a smaller font?
- I noticed when the application starts sometime is not visible the input box and the buttons. can we be sure that they are always visible?
- with the changes above the bottom border of the message box is not visible
- still the message box has a minimun size and when the window is smaller it doesnt look good. can we make the message box to have a min height of 1 px?
- which is the most popular font in react apps?
- can the app select the font according to the device (ios, android, other)?
- can we make the header text aligned with the messages box?
- I made the changes above but the text is not aligned with the message box
- now the message box has no padding with the header
- still no padding between the message box and the header
- I noticed the feedback icons now are not visible
- now the icons are at the top left inside the message box not the bottom right below the box
- now they are at the bottom right of the screen not below the message box

**Update on 11/4/24**

Today I worked to add automated unit tests to the user interface. I was expecting this to be quick as it was for the Lambda, it was not. Amazon Q was creating synthetic data that had nothing to do with my app. I needed to focus Amazon Q on chat.js to start producing good test data. I also had issues with Babel and React and took a couple of hours to get the tests running. Afterwards it was a breeze to continue working on the tests.

As always, some of my prompts:

- can you create a test suite to validate the front end app? feel free to create synthetic data to run the tests
- can you create a test suite that mimics the tests we run for the lambda in /lambda/test/lambda.test.js
- can you create a test suite for the front end app that mimic the test we built for the lambda at lambda.test.js?
- can you write a test suite for this component that cover the following scenarios:
Simple question and response
Multi-turn conversation
Handling special characters and Unicode

- running the tests I got this error: \
 Validation Error:

  Module @testing-library/jest-dom/extend-expect in the setupFilesAfterEnv option was not found.
         <rootDir> is: /src

  Configuration Documentation:
  https://jestjs.io/docs/configuration

- running the tests I got this error:

SyntaxError: /src/test/App.test.js: Support for the experimental syntax 'jsx' isn't currently enabled (28:12):

      26 |     });
      27 |
    > 28 |     render(<Chat />);
         |            ^
      29 |
      30 |     // Wait for the component to load
      31 |     await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());

    Add @babel/preset-react (https://github.com/babel/babel/tree/main/packages/babel-preset-react) to the 'presets' section of your Babel config to enable transformation.
    If you want to leave it as-is, add @babel/plugin-syntax-jsx (https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-jsx) to the 'plugins' section to enable parsing.

**Update on 11/5/24**

Today I explored refactoring. I asked Amazon Q to refactor deploy-lambda.js following OOP principles. It created a nice base class with a constructor and a few methods but I needed to move many functions to methods by hand. As always it was useful to correct small sintax errors here and there. I asked to update the documentation with this refactoring and it did it brilliantly.\
I will continue working on refactoring and extracting code to auxiliary classes.

Two prompts I used:
- I'm an enthusiast of object oriented programming. I would like to refactor deploy-lambda.js to follow OOP patterns. Can you produce an initial refactoring of the file to OOP?
- can you update the documentation of lambdadeployer.js so it is consistent with the refactoring we did

I noticed in the documentation that it says that the constructor has an argument with the region to use. This is not true and this commit fixs it. A reminder to be attentive to the output of LLMs, they can mislead you.