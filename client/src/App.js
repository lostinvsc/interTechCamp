import React, { useState, useRef } from 'react';
import './App.css';
import axios from "axios";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaMicrophone } from 'react-icons/fa';
import { FaVolumeUp } from 'react-icons/fa';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Signin from './page/Signin';
import { BrowserRouter as Router } from 'react-router-dom';
import Logout from './page/Logout.js'
function App() {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buttonTxt, setButtonTxt] = useState("Copy");
  const [isListening, setIsListening] = useState(false);
  const [currentSpeakingIndex, setCurrentSpeakingIndex] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);  // Store the recognition instance
  const chatEndRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const handleFileChange = (event) => {

    const file = event.target.files[0];

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'] //valid types of file
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Please select a jpg, jpeg, or png image.');
      setSelectedFile(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMessage('File size too large. Please upload a file smaller than 2MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage('')
  };


  // Function to handle speech recognition
  const startSpeechRecognition = () => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true); // Set listening to true when recognition starts
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript); // Set the transcribed text to question state
      setIsListening(false); // Stop listening when recognition ends
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false); // Stop listening when recognition ends
    };

    recognition.start();
    recognitionRef.current = recognition;  // Store recognition instance
  };

  const speakResponse = (text, index) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'en-US';
      speechSynthesis.speak(speech);
      setCurrentSpeakingIndex(index);
    } else {
      console.error("Text-to-speech is not supported in this browser.");
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel(); // Stop the speech immediately

    }
  };

  const askQuestion = async () => {

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      if (question.length !== 0 || selectedFile) {

        const formData = new FormData();
        formData.append('image', selectedFile); // append the image file
        formData.append('question', question);

        if (question && selectedFile) {
          setConversation((prevConvs) => [...prevConvs, {
            role: 'user',
            content: question + ` ("File Uploaded")`
          }]);
        } else if (question && !selectedFile) {
          setConversation((prevConvs) => [...prevConvs, {
            role: 'user',
            content: question
          }]);
        } else {
          setConversation((prevConvs) => [...prevConvs, {
            role: 'user',
            content: `"File Uploaded"`
          }]);
        }


        setQuestion("");
        setSelectedFile(null);
        setLoading(true);
        let response = await axios.post(`${backendUrl}/chat`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        });




        setLoading(false);
        setConversation((prevConvs) => [...prevConvs, {
          role: 'AI',
          content: response.data.answer
        }]);
      }
    } catch (error) {
      console.error('There was an error', error);
      setLoading(false);
    }
  };

  return (
    <div className="container">
     {!localStorage.getItem("clientToken")?
        <GoogleOAuthProvider clientId="112784155771-ij6prlt9kmvovtq8cbrirumtfiq70i7b.apps.googleusercontent.com">
       <Router>
          <Signin />
        </Router>
      </GoogleOAuthProvider>
           :
           <Logout/>
        }
      <h1>Chat with me</h1>

      <div className="chat-container">
        {conversation.length !== 0 && conversation.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
            <div className="message-content">
              {msg.role === 'AI' && msg.content.startsWith('```') ? (
                <div>
                  <CopyToClipboard text={msg.content}>
                    <button onClick={() => {
                      setButtonTxt("copied");
                      setTimeout(() => {
                        setButtonTxt("Copy");
                      }, 2000);
                    }} className="copy-button ">{buttonTxt}</button>
                  </CopyToClipboard>
                  <SyntaxHighlighter language="javascript" style={solarizedlight}>
                    {msg.content.replace(/```/g, '')}
                  </SyntaxHighlighter>
                  <br />
                </div>
              ) : (
                <span>{msg.content}
                  <FaVolumeUp
                    onClick={() => {
                      if (currentSpeakingIndex === index) {
                        stopSpeech(); // Stop if the same message is clicked again
                        setCurrentSpeakingIndex(null);
                      } else {
                        speakResponse(msg.content, index); // Speak the message
                      }
                    }}
                    size={15}
                    color={currentSpeakingIndex === index ? "red" : "green"} // Indicate which is currently speaking
                  />

                </span>

              )}
            </div>
            <br />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <textarea
        className="textarea"
        rows="4"
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <br />

      <div className="ask">
        <button className="button" onClick={askQuestion} disabled={loading || isListening}>
          {loading ? 'Loading...' : 'Ask'}
        </button>


        <button className="voice-button" onClick={startSpeechRecognition} disabled={isListening}>
          <FaMicrophone size={27} color="red" />
          {isListening ? 'Listening...' : 'Start Voice Chat'}
        </button>

        <div>
          <input type="file" onChange={handleFileChange} />
        </div>
      </div>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}


    </div>
  );
}

export default App;
