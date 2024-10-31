import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [lambdaUrl, setLambdaUrl] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Load the lambda url when the component mounts
    fetch('/lambdaurl.json')
      .then(response => response.json())
      .then(lambdaurl => {
        setLambdaUrl(lambdaurl.LAMBDA_FUNCTION_URL);
      })
      .catch(error => console.error('Error loading lambda url:', error));
  }, []);

  const clearChat = () => {
    //empty the list of previous messages
    setMessages([]);
  };
  
  const sendMessage = async () => {
    if (input.trim() === '' || !lambdaUrl) return;

    const userMessage = { content: input, role: 'user' };
    setInput('');

    //Add the new message to the list of messages in the session
    setMessages(messages => [...messages, userMessage]);   
    
    try { 
      const currentMessages = [...messages, userMessage];
      const response = await axios.post(lambdaUrl, { messages: currentMessages });
      console.log('Lambda function response:', response.data);
      const botMessage = { content: response.data.answer, role: 'assistant' };
      setMessages(messages => [...messages, botMessage]);
    } catch (error) {
      console.error('Error calling Lambda function:', error);
      const errorMessage = { content: 'Error: Unable to get response', 
        role: 'assistant' };
      setMessages(messages => [...messages, errorMessage]);
    }
  };

  const handleFeedback = async (isPositive) => {
    setFeedback(isPositive);
    // Here you would typically send this feedback to your backend
    // For example:
    // await axios.post(feedbackUrl, { isPositive, messages });
    console.log(`Feedback submitted: ${isPositive ? 'Positive' : 'Negative'}`);
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="feedback-container">
        <button 
          onClick={() => handleFeedback(true)} 
          className={`feedback-button ${feedback === true ? 'active' : ''}`}
        >
          <HandThumbUpIcon className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleFeedback(false)} 
          className={`feedback-button ${feedback === false ? 'active' : ''}`}
        >
          <HandThumbDownIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} >Send</button>
        <button onClick={clearChat} className="clear-chat-button">Clear</button>
      </div>
    </div>
  );
}

export default Chat;
