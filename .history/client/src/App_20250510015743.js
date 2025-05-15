import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { COMPANIES, DEFAULT_COMPANY_NAME, DEFAULT_LANGUAGE } from './config';

// Language translations
const translations = {
  en: {
    title: 'Voice Agent Demo',
    subtitle: 'Virtual Agent Assistant',
    startSection: 'Start Voice Conversation',
    instruction: 'Click the button below to start talking with our AI voice agent',
    startButton: 'Start Conversation',
    endButton: 'End Conversation',
    howItWorks: 'How it works',
    step1: 'Click the button to start a conversation with our AI voice agent',
    step2: 'Speak naturally as you would in a normal conversation',
    step3: 'The visual indicator will show if the agent is speaking or listening',
    step4: 'Click the end call button when you\'re finished',
    footer: 'Powered by Retell AI • Voice Agent Demo',
    micPermission: 'Please allow microphone access',
    micDenied: 'Microphone access denied. Please enable it to use the voice agent.',
    invalidCompany: 'Invalid company ID. Using default agent.'
  },
  ru: {
    title: 'Голосовой Агент',
    subtitle: 'Виртуальный Голосовой Помощник',
    startSection: 'Начать Голосовой Разговор',
    instruction: 'Нажмите кнопку ниже, чтобы начать разговор с нашим ИИ голосовым агентом',
    startButton: 'Начать Разговор',
    endButton: 'Завершить Разговор',
    howItWorks: 'Как это работает',
    step1: 'Нажмите кнопку, чтобы начать разговор с нашим ИИ голосовым агентом',
    step2: 'Говорите естественно, как при обычном разговоре',
    step3: 'Визуальный индикатор покажет, говорит агент или слушает',
    step4: 'Нажмите кнопку завершения звонка, когда закончите',
    footer: 'При поддержке Retell AI • Голосовой Агент',
    micPermission: 'Пожалуйста, разрешите доступ к микрофону',
    micDenied: 'Доступ к микрофону запрещен. Разрешите доступ, чтобы использовать голосового агента.',
    invalidCompany: 'Неверный ID компании. Используется агент по умолчанию.'
  }
};

function App() {
  const [callActive, setCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState('idle'); // idle, listening, speaking
  const [micPermission, setMicPermission] = useState('unknown'); // unknown, granted, denied
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [showInvalidCompanyAlert, setShowInvalidCompanyAlert] = useState(false);
  const retellClientRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Get company_id from URL query parameters
    const queryParams = new URLSearchParams(window.location.search);
    const companyIdParam = queryParams.get('company_id');
    console.log('companyIdParam', companyIdParam);
    
    if (companyIdParam) {
      setCompanyId(companyIdParam);
      
      // Immediately update company info based on the company ID
      if (COMPANIES[companyIdParam]) {
        const [_, companyLanguage, companyDisplayName] = COMPANIES[companyIdParam];
        setLanguage(companyLanguage);
        setCompanyName(companyDisplayName);
      } else if (companyIdParam) {
        // Invalid company ID
        setShowInvalidCompanyAlert(true);
        setTimeout(() => {
          setShowInvalidCompanyAlert(false);
        }, 5000);
      }
    }

    // Check if microphone permission is already granted
    checkMicrophonePermission();
    
    // Initialize the Retell client
    retellClientRef.current = new RetellWebClient();
    const client = retellClientRef.current;

    client.on('call_started', () => {
      console.log('Call started');
      setAgentStatus('listening');
    });

    client.on('call_ended', () => {
      console.log('Call ended');
      setAgentStatus('idle');
      setCallActive(false);
    });

    client.on('agent_start_talking', () => {
      console.log('Agent started talking');
      setAgentStatus('speaking');
    });

    client.on('agent_stop_talking', () => {
      console.log('Agent stopped talking');
      setAgentStatus('listening');
    });

    client.on('update', (update) => {
      console.log('Update:', update);
    });

    client.on('error', (error) => {
      console.error('An error occurred:', error);
      client.stopCall();
      setCallActive(false);
      setAgentStatus('idle');
    });

    // Cleanup on unmount
    return () => {
      client.stopCall();
    };
  }, []);

  // Check if microphone permission is already granted
  const checkMicrophonePermission = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      if (audioInputs.length > 0) {
        // Check if we have label information, which indicates permission is granted
        if (audioInputs[0].label) {
          setMicPermission('granted');
        } else {
          setMicPermission('unknown');
        }
      } else {
        setMicPermission('unknown');
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      setMicPermission('unknown');
    }
  };

  // Request microphone access explicitly
  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If we get here, permission was granted
      setMicPermission('granted');
      
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Microphone access granted');
    } catch (error) {
      console.error('Microphone access denied:', error);
      setMicPermission('denied');
    }
  };

  // Fetch the web call token from your own server endpoint
  const createWebCall = async () => {
    try {
      const response = await fetch('/api/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metadata: { demo: true },
          company_id: companyId 
        }),
      });
      console.log('response', response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // We don't need to set these values here anymore since we're already setting them
      // from the URL parameters, but we'll keep this as a fallback
      if (data.metadata) {
        // Only update if these values weren't already set from URL parameters
        if (!companyId && data.metadata.company_name !== companyName) {
          setLanguage(data.metadata.language);
          setCompanyName(data.metadata.company_name);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error creating web call on server:', error);
      throw error;
    }
  };

  // Start or restart the call while ensuring only one process runs at a time
  const handleCallAction = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      if (callActive) {
        // End the call
        console.log('Stopping current call...');
        setCallActive(false);
        setAgentStatus('idle');
        await retellClientRef.current.stopCall();
      } else {
        // First check if we need to request microphone permission
        if (micPermission !== 'granted') {
          await requestMicrophoneAccess();
          if (micPermission !== 'granted') {
            // Don't proceed if permission was not granted
            isProcessingRef.current = false;
            return;
          }
        }
        
        // Start the call
        setCallActive(true);
        setAgentStatus('connecting');
        console.log('Creating new web call...');
        const callData = await createWebCall();
        console.log('Call data:', callData);
        const accessToken = callData.access_token;
        await retellClientRef.current.startCall({
          accessToken,
          sampleRate: 24000,         // Optional: adjust as needed
          captureDeviceId: 'default',  // Optional: choose your mic device
          emitRawAudioSamples: false,  // Optional: disable raw audio sample events
        });
      }
    } catch (error) {
      console.error('Error with call action:', error);
      setAgentStatus('idle');
      setCallActive(false);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Helper to render the appropriate status indicator
  const renderStatusIndicator = () => {
    if (!callActive) return null;

    const statusClass = agentStatus === 'speaking' ? 'agent-speaking' : 
                       agentStatus === 'listening' ? 'agent-listening' : 
                       'agent-connecting';

    return (
      <div className={`status-indicator ${statusClass}`}>
        {agentStatus === 'speaking' && (
          <div className="wave-container">
            <div className="speaking-bar"></div>
            <div className="speaking-bar"></div>
            <div className="speaking-bar"></div>
          </div>
        )}
        {agentStatus === 'listening' && <div className="listening-pulse"></div>}
        {agentStatus === 'connecting' && <div className="connecting-pulse"></div>}
      </div>
    );
  };

  // Render the invalid company alert if needed
  const renderInvalidCompanyAlert = () => {
    if (!showInvalidCompanyAlert) return null;
    
    return (
      <div className="alert-container">
        <div className="alert">
          {translations[language].invalidCompany}
        </div>
      </div>
    );
  };

  // Check if microphone permission is denied
  const isMicDenied = micPermission === 'denied';

  return (
    <div className="app-container">
      {renderInvalidCompanyAlert()}

      <div className="content-container">
        <header>
          <h1>{translations[language].title}</h1>
          <p className="subtitle">{translations[language].subtitle}</p>
        </header>

        <main>
          <section className="conversation-section">
            <h2>{translations[language].startSection}</h2>
            <p className="instruction">{translations[language].instruction}</p>
            
            {/* Conversation/status area */}
            <div className="call-area">
              {renderStatusIndicator()}
              
              <button 
                className={`call-button ${callActive ? 'active' : ''} ${isMicDenied ? 'disabled' : ''}`}
                onClick={handleCallAction}
                disabled={isMicDenied}
              >
                <span className="call-icon">
                  {callActive ? '⏹' : '🎤'}
                </span>
                {callActive 
                  ? translations[language].endButton
                  : translations[language].startButton
                }
              </button>
              
              {isMicDenied && (
                <p className="mic-error">{translations[language].micDenied}</p>
              )}
              
              {micPermission === 'unknown' && !callActive && (
                <p className="mic-notice">{translations[language].micPermission}</p>
              )}
            </div>
          </section>

          <section className="how-it-works">
            <h2>{translations[language].howItWorks}</h2>
            <ol>
              <li>{translations[language].step1}</li>
              <li>{translations[language].step2}</li>
              <li>{translations[language].step3}</li>
              <li>{translations[language].step4}</li>
            </ol>
          </section>
        </main>

        <footer>
          <p>{translations[language].footer}</p>
        </footer>
      </div>

      <style jsx="true">{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #333;
          background-color: #f7f7f7;
        }
        
        .app-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f7f7f7;
          padding: 20px;
        }
        
        .content-container {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        header, main, footer {
          background-color: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        header {
          text-align: center;
          padding-top: 20px;
          padding-bottom: 20px;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 5px;
          color: #222;
        }
        
        .subtitle {
          font-size: 18px;
          color: #666;
        }
        
        main {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        
        .conversation-section {
          text-align: center;
        }
        
        h2 {
          font-size: 24px;
          margin-bottom: 16px;
          color: #333;
        }
        
        .instruction {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
          line-height: 1.5;
        }
        
        .call-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-top: 20px;
        }
        
        .call-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 100px;
          padding: 15px 30px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: fit-content;
          min-width: 220px;
        }
        
        .call-button:hover {
          background-color: #43A047;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        
        .call-button.active {
          background-color: #f44336;
        }
        
        .call-button.active:hover {
          background-color: #e53935;
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
        }
        
        .call-button.disabled {
          background-color: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .call-icon {
          font-size: 18px;
        }
        
        .how-it-works {
          margin-top: 10px;
        }
        
        ol {
          padding-left: 20px;
        }
        
        li {
          margin-bottom: 12px;
          line-height: 1.5;
          color: #444;
        }
        
        footer {
          text-align: center;
          font-size: 14px;
          color: #777;
          padding: 15px;
          margin-top: auto;
        }
        
        .mic-error {
          color: #f44336;
          font-size: 14px;
          max-width: 300px;
          text-align: center;
        }
        
        .mic-notice {
          color: #ff9800;
          font-size: 14px;
        }
        
        .status-indicator {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 15px;
          position: relative;
        }
        
        .agent-speaking {
          background-color: rgba(0, 150, 136, 0.1);
        }
        
        .agent-listening {
          background-color: rgba(33, 150, 243, 0.1);
        }
        
        .agent-connecting {
          background-color: rgba(255, 152, 0, 0.1);
        }
        
        .wave-container {
          display: flex;
          width: 60%;
          height: 60%;
          justify-content: space-between;
          align-items: center;
        }
        
        .speaking-bar {
          background-color: #009688;
          width: 4px;
          height: 100%;
          animation: speakingWave 0.7s infinite;
          border-radius: 2px;
        }
        
        .speaking-bar:nth-child(1) { animation-delay: 0s; }
        .speaking-bar:nth-child(2) { animation-delay: 0.2s; }
        .speaking-bar:nth-child(3) { animation-delay: 0.4s; }
        
        .listening-pulse {
          width: 60%;
          height: 60%;
          background-color: rgba(33, 150, 243, 0.5);
          border-radius: 50%;
          animation: listeningPulse 1.5s infinite ease-in-out;
        }
        
        .connecting-pulse {
          width: 60%;
          height: 60%;
          background-color: rgba(255, 152, 0, 0.5);
          border-radius: 50%;
          animation: connecting 1.5s infinite ease-in-out;
        }
        
        .alert-container {
          position: fixed;
          top: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          z-index: 10;
          animation: alertFadeIn 5s forwards;
        }
        
        .alert {
          background-color: rgba(253, 236, 234, 0.9);
          border: 1px solid #f44336;
          border-radius: 6px;
          padding: 12px 20px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          color: #d32f2f;
          max-width: 90%;
          backdrop-filter: blur(5px);
        }
        
        @keyframes speakingWave {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        
        @keyframes listeningPulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
        
        @keyframes connecting {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        @keyframes alertFadeIn {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @media (max-width: 640px) {
          .content-container {
            gap: 15px;
          }
          
          header, main, footer {
            padding: 20px;
          }
          
          h1 {
            font-size: 24px;
          }
          
          .subtitle {
            font-size: 16px;
          }
          
          h2 {
            font-size: 20px;
          }
          
          .instruction {
            font-size: 14px;
          }
          
          .call-button {
            padding: 12px 25px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;