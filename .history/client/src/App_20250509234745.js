import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

// Language translations
const translations = {
  en: {
    title: 'Voice Agent',
    micPermissionButton: {
      unknown: '🎤 Allow microphone access',
      granted: '🎤 Microphone access allowed',
      denied: '❌ Microphone access denied'
    },
    callButton: {
      start: '🎤 Start Voice Agent',
      restart: '🎤 Restart Voice Agent'
    },
    agentStatus: {
      speaking: 'Agent is speaking',
      listening: 'Agent is listening',
      connecting: 'Connecting...',
      idle: 'Not active'
    },
    invalidCompany: 'Invalid company ID. Using default agent.'
  },
  ru: {
    title: 'Голосовой Агент',
    micPermissionButton: {
      unknown: '🎤 Разрешить доступ к микрофону',
      granted: '🎤 Доступ к микрофону разрешен',
      denied: '❌ Доступ к микрофону запрещен'
    },
    callButton: {
      start: '🎤 Запустить Голосового Агента',
      restart: '🎤 Перезапустить Голосового Агента'
    },
    agentStatus: {
      speaking: 'Агент говорит',
      listening: 'Агент слушает',
      connecting: 'Подключение...',
      idle: 'Не активен'
    },
    invalidCompany: 'Неверный ID компании. Используется агент по умолчанию.'
  }
};

function App() {
  const [callActive, setCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState('idle'); // idle, listening, speaking
  const [micPermission, setMicPermission] = useState('unknown'); // unknown, granted, denied
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState('МТТ');
  const [language, setLanguage] = useState('ru');
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Process metadata from response
      if (data.metadata) {
        setLanguage(data.metadata.language);
        setCompanyName(data.metadata.company_name);
        
        if (!data.metadata.valid_company && companyId) {
          setShowInvalidCompanyAlert(true);
          
          // Hide the alert after 5 seconds
          setTimeout(() => {
            setShowInvalidCompanyAlert(false);
          }, 5000);
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
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Helper to render the appropriate status indicator
  const renderStatusIndicator = () => {
    if (!callActive) return null;

    let indicatorStyles = {
      ...styles.statusIndicator,
      background: getStatusColor(),
    };

    return (
      <div style={styles.statusContainer}>
        <div style={indicatorStyles}>
          {agentStatus === 'speaking' ? (
            <div style={styles.speakingAnimation}>
              <div className="speaking-bar"></div>
              <div className="speaking-bar"></div>
              <div className="speaking-bar"></div>
              <div className="speaking-bar"></div>
              <div className="speaking-bar"></div>
            </div>
          ) : (
            <div style={getAnimationStyle()}></div>
          )}
        </div>
        <div style={styles.statusText}>{getStatusText()}</div>
      </div>
    );
  };

  // Get animation style based on current status
  const getAnimationStyle = () => {
    switch (agentStatus) {
      case 'listening':
        return styles.listeningAnimation;
      case 'connecting':
        return styles.connectingAnimation;
      default:
        return {};
    }
  };

  // Get status color based on current status
  const getStatusColor = () => {
    switch (agentStatus) {
      case 'speaking':
        return 'rgba(0, 150, 136, 0.2)';
      case 'listening':
        return 'rgba(33, 150, 243, 0.2)';
      case 'connecting':
        return 'rgba(255, 152, 0, 0.2)';
      default:
        return 'rgba(158, 158, 158, 0.2)';
    }
  };

  // Get status text based on current status
  const getStatusText = () => {
    const text = translations[language].agentStatus[agentStatus];
    return text || translations[language].agentStatus.idle;
  };

  // Get microphone button text based on permission status
  const getMicButtonText = () => {
    return translations[language].micPermissionButton[micPermission];
  };

  // Get microphone button style based on permission status
  const getMicButtonStyle = () => {
    switch (micPermission) {
      case 'granted':
        return { ...styles.micButton, background: 'linear-gradient(90deg, #4caf50, #2e7d32)' };
      case 'denied':
        return { ...styles.micButton, background: 'linear-gradient(90deg, #f44336, #d32f2f)' };
      default:
        return { ...styles.micButton, background: 'linear-gradient(90deg, #9e9e9e, #616161)' };
    }
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

  return (
    <div style={styles.appContainer}>
      {/* Dynamic background objects */}
      <div className="dynamic-background">
        {Array.from({ length: 70 }).map((_, i) => {
          const shapeClass = `object${(i % 7) + 1}`;
          const randomTop = Math.floor(Math.random() * 100) + '%';
          const randomLeft = Math.floor(Math.random() * 100) + '%';
          const randomDuration = 20 + Math.random() * 20; // duration between 20s and 40s
          const randomDelay = Math.random() * 10; // delay between 0s and 10s
          const inlineStyle = {
            top: randomTop,
            left: randomLeft,
            animationDuration: `${randomDuration}s`,
            animationDelay: `${randomDelay}s`
          };
          return <div key={i} className={`object ${shapeClass}`} style={inlineStyle}></div>;
        })}
      </div>

      {/* Inline styles for animations and hover effects */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .call-button:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        .dynamic-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .object {
          position: absolute;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
        }
        /* Animation keyframes */
        @keyframes moveRight {
          0% { transform: translateX(0); }
          100% { transform: translateX(100vw); }
        }
        @keyframes moveLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100vw); }
        }
        @keyframes rotateAndMove {
          0% { transform: rotate(0deg) translateX(0); }
          100% { transform: rotate(360deg) translateX(100vw); }
        }
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes squareMove {
          0% { transform: translateX(0); }
          50% { transform: translateX(20px); }
          100% { transform: translateX(0); }
        }
        @keyframes triangleMove {
          0% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0); }
        }
        @keyframes circleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        /* Object styles with animations */
        .object1 {
          width: 50px;
          height: 50px;
          animation-name: moveRight;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .object2 {
          width: 30px;
          height: 30px;
          animation-name: moveLeft;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .object3 {
          width: 70px;
          height: 70px;
          animation-name: rotateAndMove;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .object4 {
          width: 40px;
          height: 40px;
          animation-name: floatUpDown;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .object5 {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          animation-name: squareMove;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
//        .object6 {
//          border-left: 50px solid transparent;
//          border-right: 30px solid transparent;
//          border-bottom: 20px solid transparent;
//          animation-name: triangleMove;
//          animation-timing-function: linear;
//          animation-iteration-count: infinite;
//        }
        .object7 {
          width: 40px;
          height: 40px;
          animation-name: circleBounce;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        
        /* Speech wave animation */
        @keyframes speakingWave {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        
        /* Speaking animation bars */
        .speaking-bar {
          background-color: #009688;
          width: 4px;
          height: 100%;
          animation: speakingWave 0.7s infinite;
        }
        .speaking-bar:nth-child(1) { animation-delay: 0s; }
        .speaking-bar:nth-child(2) { animation-delay: 0.1s; }
        .speaking-bar:nth-child(3) { animation-delay: 0.2s; }
        .speaking-bar:nth-child(4) { animation-delay: 0.3s; }
        .speaking-bar:nth-child(5) { animation-delay: 0.4s; }
        
        /* Listening pulse animation */
        @keyframes listeningPulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
        
        /* Connecting animation */
        @keyframes connecting {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        /* Alert animation */
        @keyframes alertFadeIn {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {renderInvalidCompanyAlert()}

      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={styles.logo}>{companyName}</span>
          <span style={styles.titleText}>{translations[language].title}</span>
        </h1>
        
        {renderStatusIndicator()}
        
        <button 
          onClick={requestMicrophoneAccess} 
          className="call-button" 
          style={getMicButtonStyle()}
          disabled={micPermission === 'granted'}
        >
          {getMicButtonText()}
        </button>
        
        <button 
          onClick={startOrRestartCall} 
          className="call-button" 
          style={{
            ...styles.button,
            background: callActive 
              ? 'linear-gradient(90deg, #d32f2f, #f44336)' 
              : 'linear-gradient(90deg, #0044CC, #0056D2)',
            marginTop: '15px',
            opacity: micPermission !== 'granted' ? 0.7 : 1,
          }}
          disabled={micPermission !== 'granted'}
        >
          {callActive 
            ? translations[language].callButton.restart
            : translations[language].callButton.start
          }
        </button>
      </div>
    </div>
  );
}


const styles = {
  appContainer: {
    position: 'relative',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.1), transparent 70%), linear-gradient(135deg, #0044CC, #0056D2)',
    backgroundBlendMode: 'overlay',
    fontFamily: "'Montserrat', sans-serif",
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '40px 60px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    animation: 'fadeIn 1s ease-in-out',
    zIndex: 1,
    backdropFilter: 'blur(10px)',
    width: '420px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '25px',
    color: '#333',
    textShadow: '1px 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    color: '#0044CC',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  titleText: {
    fontSize: '1.8rem',
  },
  button: {
    fontSize: '1.2rem',
    padding: '15px 30px',
    borderRadius: '30px',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s, background 0.3s',
    width: '100%',
    marginTop: '20px',
    fontWeight: '500',
  },
  micButton: {
    fontSize: '1.1rem',
    padding: '12px 25px',
    borderRadius: '30px',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s, background 0.3s',
    width: '100%',
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
    height: '80px',
    justifyContent: 'center',
  },
  statusIndicator: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '10px',
    transition: 'background 0.3s',
  },
  statusText: {
    fontSize: '1rem',
    color: '#555',
    transition: 'color 0.3s',
  },
  speakingAnimation: {
    display: 'flex',
    width: '60%',
    height: '60%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listeningAnimation: {
    width: '60%',
    height: '60%',
    backgroundColor: 'rgba(33, 150, 243, 0.5)',
    borderRadius: '50%',
    animation: 'listeningPulse 1.5s infinite ease-in-out',
  },
  connectingAnimation: {
    width: '60%',
    height: '60%',
    backgroundColor: 'rgba(255, 152, 0, 0.5)',
    borderRadius: '50%',
    animation: 'connecting 1.5s infinite ease-in-out',
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
  }
};

export default App;