import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { COMPANIES, DEFAULT_COMPANY_NAME, DEFAULT_LANGUAGE } from './config';

// Language translations
const translations = {
  en: {
    title: 'Voice Agent Demo',
    subtitle: 'Virtual Agent Assistant',
    sectionTitle: 'Start Voice Conversation',
    sectionDescription: 'Click the button below to start talking with our AI voice agent',
    micPermissionButton: {
      unknown: 'Allow microphone access',
      granted: 'Microphone access allowed',
      denied: 'Microphone access denied'
    },
    callButton: {
      start: 'Start Conversation',
      restart: 'Restart Conversation',
      end: 'End Call'
    },
    agentStatus: {
      speaking: 'Agent is speaking',
      listening: 'Agent is listening',
      connecting: 'Connecting...',
      idle: 'Not active'
    },
    invalidCompany: 'Invalid company ID. Using default agent.',
    howItWorks: {
      title: 'How it works',
      steps: [
        'Click the button to start a conversation with our AI voice agent',
        'Speak naturally as you would in a normal conversation',
        'The visual indicator will show if the agent is speaking or listening',
        'Click the end call button when you\'re finished'
      ]
    }
  },
  ru: {
    title: 'Голосовой Агент',
    subtitle: 'Виртуальный Голосовой Помощник',
    sectionTitle: 'Начать Голосовую Беседу',
    sectionDescription: 'Нажмите кнопку ниже, чтобы начать разговор с нашим ИИ голосовым агентом',
    micPermissionButton: {
      unknown: 'Разрешить доступ к микрофону',
      granted: 'Доступ к микрофону разрешен',
      denied: 'Доступ к микрофону запрещен'
    },
    callButton: {
      start: 'Начать Разговор',
      restart: 'Перезапустить Разговор',
      end: 'Завершить Звонок'
    },
    agentStatus: {
      speaking: 'Агент говорит',
      listening: 'Агент слушает',
      connecting: 'Подключение...',
      idle: 'Не активен'
    },
    invalidCompany: 'Неверный ID компании. Используется агент по умолчанию.',
    howItWorks: {
      title: 'Как это работает',
      steps: [
        'Нажмите кнопку, чтобы начать разговор с нашим ИИ голосовым агентом',
        'Говорите естественно, как при обычном разговоре',
        'Визуальный индикатор покажет, говорит ли агент или слушает',
        'Нажмите кнопку завершения звонка, когда закончите'
      ]
    }
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
  const startOrRestartCall = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      if (callActive) {
        console.log('Stopping current call...');
        setCallActive(false);
        setAgentStatus('idle');
        await retellClientRef.current.stopCall();
        // Small delay to ensure the call stops completely
        await new Promise(resolve => setTimeout(resolve, 500));
      }
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
    } catch (error) {
      console.error('Error starting/restarting call:', error);
      setAgentStatus('idle');
      setCallActive(false);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Handle call button click based on the current state
  const handleCallButtonClick = () => {
    if (micPermission !== 'granted') {
      requestMicrophoneAccess();
    } else {
      startOrRestartCall();
    }
  };

  // End the call
  const endCall = async () => {
    if (callActive) {
      console.log('Ending call...');
      setCallActive(false);
      setAgentStatus('idle');
      await retellClientRef.current.stopCall();
    }
  };

  // Helper to render the appropriate status indicator
  const renderStatusIndicator = () => {
    if (!callActive) return null;

    return (
      <div style={styles.statusIndicator}>
        <div style={{
          ...styles.indicatorDot,
          backgroundColor: agentStatus === 'speaking' ? '#4CAF50' : '#2196F3',
          animation: agentStatus === 'speaking' ? 'pulse 1.5s infinite' : 'listening 1.5s infinite'
        }}></div>
        <div style={styles.statusText}>{translations[language].agentStatus[agentStatus]}</div>
      </div>
    );
  };

  // Render the invalid company alert if needed
  const renderInvalidCompanyAlert = () => {
    if (!showInvalidCompanyAlert) return null;
    
    return (
      <div style={styles.alertContainer}>
        <div style={styles.alert}>
          {translations[language].invalidCompany}
        </div>
      </div>
    );
  };

  // Render the how it works section
  const renderHowItWorks = () => {
    return (
      <div style={styles.howItWorksContainer}>
        <h2 style={styles.howItWorksTitle}>
          {translations[language].howItWorks.title}
        </h2>
        <ol style={styles.howItWorksList}>
          {translations[language].howItWorks.steps.map((step, index) => (
            <li key={index} style={styles.howItWorksItem}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    );
  };

  return (
    <div style={styles.appContainer}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', sans-serif;
          background-color: #f5f5f5;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        @keyframes listening {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes alertFadeIn {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {renderInvalidCompanyAlert()}

      <div style={styles.cardContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>{translations[language].title}</h1>
          <p style={styles.subtitle}>{translations[language].subtitle}</p>
        </div>
      </div>

      <div style={styles.cardContainer}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>{translations[language].sectionTitle}</h2>
          <p style={styles.sectionDescription}>{translations[language].sectionDescription}</p>
          
          {renderStatusIndicator()}
          
          <div style={styles.buttonContainer}>
            {micPermission !== 'granted' && (
              <button 
                onClick={requestMicrophoneAccess} 
                style={styles.micButton}
              >
                {translations[language].micPermissionButton[micPermission]}
              </button>
            )}
            
            {callActive ? (
              <button 
                onClick={endCall} 
                style={styles.endCallButton}
              >
                {translations[language].callButton.end}
              </button>
            ) : (
              <button 
                onClick={handleCallButtonClick} 
                style={{
                  ...styles.callButton,
                  opacity: micPermission !== 'granted' && micPermission !== 'unknown' ? 0.7 : 1,
                }}
                disabled={micPermission === 'denied'}
              >
                <div style={styles.phoneIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.01 15.38C18.78 15.38 17.59 15.18 16.48 14.82C16.13 14.7 15.74 14.79 15.47 15.06L13.9 17.03C11.07 15.68 8.42 13.13 7.01 10.2L8.96 8.54C9.23 8.26 9.31 7.87 9.2 7.52C8.83 6.41 8.64 5.22 8.64 3.99C8.64 3.45 8.19 3 7.65 3H4.19C3.65 3 3 3.24 3 3.99C3 13.28 10.73 21 20.01 21C20.72 21 21 20.37 21 19.82V16.37C21 15.83 20.55 15.38 20.01 15.38Z" fill="white"/>
                  </svg>
                </div>
                {translations[language].callButton.start}
              </button>
            )}
          </div>
          
          {renderHowItWorks()}
        </div>
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    background: '#f5f5f5',
    padding: '20px',
    boxSizing: 'border-box',
  },
  cardContainer: {
    width: '100%',
    maxWidth: '700px',
    margin: '10px 0',
  },
  header: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px 40px',
    textAlign: 'left',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px 40px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#333',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
    margin: 0,
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#333',
  },
  sectionDescription: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
    maxWidth: '600px',
    margin: '0 auto 30px auto',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '30px',
  },
  micButton: {
    backgroundColor: '#9e9e9e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '300px',
    transition: 'background-color 0.3s',
  },
  callButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.3s',
    maxWidth: '300px',
    width: '100%',
    boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)',
  },
  endCallButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '30px',
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    maxWidth: '300px',
    width: '100%',
    boxShadow: '0 4px 8px rgba(244, 67, 54, 0.3)',
  },
  phoneIcon: {
    marginRight: '10px',
  },
  statusIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '10px 0 20px 0',
  },
  indicatorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginBottom: '8px',
  },
  statusText: {
    fontSize: '14px',
    color: '#666',
  },
  alertContainer: {
    position: 'fixed',
    top: '20px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 10,
    animation: 'alertFadeIn 5s forwards',
  },
  alert: {
    background: 'rgba(253, 236, 234, 0.9)',
    border: '1px solid #f44336',
    borderRadius: '6px',
    padding: '12px 20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    color: '#d32f2f',
    maxWidth: '90%',
    backdropFilter: 'blur(5px)',
  },
  howItWorksContainer: {
    textAlign: 'left',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '20px 25px',
    marginTop: '10px',
  },
  howItWorksTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#333',
  },
  howItWorksList: {
    margin: 0,
    paddingLeft: '25px',
    color: '#555',
  },
  howItWorksItem: {
    marginBottom: '10px',
    fontSize: '15px',
    lineHeight: '1.5',
  }
};

export default App;