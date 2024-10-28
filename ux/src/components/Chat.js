import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [lambdaUrl, setLambdaUrl] = useState('');

  useEffect(() => {
    // Load the configuration when the component mounts
    fetch('/config.json')
      .then(response => response.json())
      .then(config => {
        setLambdaUrl(config.LAMBDA_FUNCTION_URL);
      })
      .catch(error => console.error('Error loading config:', error));
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

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
        <button onClick={clearChat} className="clear-chat-button">Clear</button>
      </div>
    </div>
  );
}

export default Chat;
