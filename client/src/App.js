import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { DEFAULT_COMPANY_NAME, DEFAULT_LANGUAGE } from './config';

// Language translations
const translations = {
  en: {
    title: 'Voice Agent Demo',
    subtitle: 'Voice Agent Demo',
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
    poweredBy: 'Powered by Sycorax.ai',
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
    subtitle: 'Демо Голосовой Агент',
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
    poweredBy: 'Powered by aiwing.ru',
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
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);
  const [companyId, setCompanyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useSecondaryNumber, setUseSecondaryNumber] = useState(false);
  const retellClientRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Get company_id from URL query parameters and fetch company data
    const fetchCompanyData = async () => {
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams(window.location.search);
        const companyIdParam = queryParams.get('company_id');
        
        if (companyIdParam) {
          console.log('Fetching company data for ID:', companyIdParam);
          setCompanyId(companyIdParam);
          if (companyIdParam === 'starsmile') {
            setLanguage('ru');
          }
          const response = await fetch(`/api/company/${companyIdParam}`);

          if (response.ok) {
            const data = await response.json();
            setCompanyName(data.companyName);
            if (companyIdParam !== 'starsmile' && data.language) {
              setLanguage(data.language);
            }
            console.log('Company data loaded:', data);
          } else {
            console.warn('Company not found, using defaults');
          }
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();

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

  useEffect(() => {
    setUseSecondaryNumber(false);
  }, [companyId]);

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
      const payload = {
        metadata: { demo: true },
        company_id: companyId
      };

      if (companyId === 'starsmile') {
        payload.use_secondary = useSecondaryNumber;
      }

      const response = await fetch('/api/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
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

  const isStarSmile = companyId === 'starsmile';
  const styles = isStarSmile ? starSmileStyles : defaultStyles;
  const globalStyles = isStarSmile ? starSmileGlobalStyles : defaultGlobalStyles;
  const statusColors = isStarSmile
    ? { speaking: '#6ad7c8', listening: '#4d7df0' }
    : { speaking: '#4CAF50', listening: '#2196F3' };

  // Helper to render the appropriate status indicator
  const renderStatusIndicator = () => {
    if (!callActive) return null;

    return (
      <div style={styles.statusIndicator}>
        <div style={{
          ...styles.indicatorDot,
          backgroundColor: agentStatus === 'speaking' ? statusColors.speaking : statusColors.listening,
          animation: agentStatus === 'speaking' ? 'pulse 1.5s infinite' : 'listening 1.5s infinite'
        }}></div>
        <div style={styles.statusText}>{translations[language].agentStatus[agentStatus]}</div>
      </div>
    );
  };

  // Render the how it works section with dynamic powered by text
  const renderHowItWorks = () => {
    if (isStarSmile) {
      return null;
    }

    return (
      <div style={styles.howItWorksContainer}>
        <h2 style={styles.howItWorksTitle}>
          {translations[language].poweredBy}
        </h2>
      </div>
    );
  };

  const renderDentalHighlights = () => {
    if (!isStarSmile) {
      return null;
    }

    return (
      <div style={styles.highlightContainer}>
        <h3 style={styles.highlightTitle}>Преимущества ИИ-ресепшиониста для вашей клиники</h3>
        <ul style={styles.highlightList}>
          <li style={styles.highlightItem}>
            <span style={styles.highlightIcon}>🤖</span>
            Автоматически обрабатывает до 80% звонков, освобождая администраторов для сложных задач и повышения качества сервиса.
          </li>
          <li style={styles.highlightItem}>
            <span style={styles.highlightIcon}>📊</span>
            Передаёт владельцу отчёты о лидах, пропущенных звонках и популярных услугах, помогая принимать управленческие решения.
          </li>
          <li style={styles.highlightItem}>
            <span style={styles.highlightIcon}>⚙️</span>
            Интегрируется с CRM и расписанием клиники, чтобы пациенты мгновенно получали подтверждение записи без участия персонала.
          </li>
        </ul>
      </div>
    );
  };

  const sectionTitleText = isStarSmile
    ? 'Познакомьтесь с ИИ-ресепшионистом для стоматологических клиник'
    : translations[language].sectionTitle;
  const sectionDescriptionText = isStarSmile
    ? 'Запустите голосового ассистента, который круглосуточно отвечает на вопросы пациентов, записывает на приём и помогает владельцам увеличивать загрузку кресел.'
    : translations[language].sectionDescription;

  // Show loading spinner while fetching company data
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <style>{globalStyles}</style>

      <div style={styles.cardContainer}>
        <div style={styles.header}>
          {isStarSmile ? (
            <>
              <div style={styles.heroContent}>
                <div style={styles.heroBadge}>ИИ-ресепшионист для стоматологических клиник</div>
                <h1 style={styles.heroTitle}>{companyName || 'StarSmile AI Receptionist'}</h1>
                <p style={styles.heroSubtitle}>
                  Продвинутый голосовой ассистент, который помогает клиникам принимать звонки, записывать пациентов и продавать дополнительные услуги без участия персонала.
                </p>
              </div>
              <div style={styles.heroImage} aria-hidden="true">🪥</div>
            </>
          ) : (
            <h1 style={styles.title}>{companyName}</h1>
          )}
        </div>
      </div>

      <div style={styles.cardContainer}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>{sectionTitleText}</h2>
          <p style={styles.sectionDescription}>{sectionDescriptionText}</p>
          
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

            {isStarSmile && (
              <button
                type="button"
                onClick={() => setUseSecondaryNumber(prev => !prev)}
                style={{
                  ...styles.toggleButton,
                  ...(useSecondaryNumber ? styles.toggleButtonActive : {}),
                }}
                aria-pressed={useSecondaryNumber}
              >
                <span style={styles.toggleLabel}>вторичный</span>
                <span
                  style={{
                    ...styles.toggleSwitch,
                    ...(useSecondaryNumber ? styles.toggleSwitchActive : {}),
                  }}
                  aria-hidden="true"
                >
                  <span
                    style={{
                      ...styles.toggleHandle,
                      ...(useSecondaryNumber ? styles.toggleHandleActive : {}),
                    }}
                  />
                </span>
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

          {renderDentalHighlights()}

          {renderHowItWorks()}
        </div>
      </div>
    </div>
  );
}

const defaultGlobalStyles = `
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

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const starSmileGlobalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

  body {
    margin: 0;
    padding: 0;
    font-family: 'Poppins', sans-serif;
    background: linear-gradient(135deg, #f4faff 0%, #fff8fb 100%);
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.8; }
  }

  @keyframes listening {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const defaultStyles = {
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
  loadingContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4CAF50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
    fontFamily: 'Inter, sans-serif',
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
  highlightContainer: {
    display: 'none',
  },
  highlightTitle: {},
  highlightList: {},
  highlightItem: {},
  highlightIcon: {},
  heroContent: {},
  heroBadge: {},
  heroTitle: {},
  heroSubtitle: {},
  heroImage: {},
};

const starSmileStyles = {
  appContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    background: 'linear-gradient(135deg, #f4faff 0%, #fff8fb 100%)',
    padding: '32px 20px',
    boxSizing: 'border-box',
  },
  loadingContainer: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f4faff 0%, #fff8fb 100%)',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '5px solid rgba(255, 255, 255, 0.7)',
    borderTop: '5px solid #4d7df0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#4d5a6b',
    fontFamily: 'Poppins, sans-serif',
  },
  cardContainer: {
    width: '100%',
    maxWidth: '900px',
    margin: '10px 0',
  },
  header: {
    background: 'linear-gradient(135deg, rgba(77, 125, 240, 0.95), rgba(104, 217, 255, 0.9))',
    borderRadius: '24px',
    padding: '36px 42px',
    boxShadow: '0 20px 40px rgba(77, 125, 240, 0.25)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    color: 'white',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    padding: '36px 42px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(13, 54, 134, 0.08)',
    backdropFilter: 'blur(6px)',
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
    fontSize: '26px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#264066',
  },
  sectionDescription: {
    fontSize: '17px',
    color: '#4d5a6b',
    marginBottom: '30px',
    maxWidth: '560px',
    margin: '0 auto 30px auto',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  micButton: {
    backgroundColor: 'rgba(77, 125, 240, 0.18)',
    color: '#264066',
    border: '1px solid rgba(77, 125, 240, 0.35)',
    borderRadius: '16px',
    padding: '14px 22px',
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '320px',
    transition: 'all 0.3s ease',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    width: '100%',
    maxWidth: '320px',
    padding: '14px 18px',
    borderRadius: '18px',
    border: '1px solid rgba(77, 125, 240, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    color: '#264066',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  toggleButtonActive: {
    borderColor: 'rgba(106, 215, 200, 0.8)',
    boxShadow: '0 12px 20px rgba(77, 125, 240, 0.18)',
    background: 'rgba(77, 125, 240, 0.12)',
    color: '#1f3b66',
  },
  toggleLabel: {
    flex: 1,
    textAlign: 'left',
  },
  toggleSwitch: {
    width: '48px',
    height: '26px',
    borderRadius: '999px',
    background: 'rgba(77, 125, 240, 0.25)',
    position: 'relative',
    transition: 'background 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px',
  },
  toggleSwitchActive: {
    background: 'linear-gradient(135deg, #4d7df0, #6ad7c8)',
  },
  toggleHandle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: '0 4px 12px rgba(77, 125, 240, 0.25)',
    transform: 'translateX(0)',
    transition: 'transform 0.3s ease',
  },
  toggleHandleActive: {
    transform: 'translateX(22px)',
  },
  callButton: {
    background: 'linear-gradient(135deg, #4d7df0, #66d9ff)',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    padding: '18px 36px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    maxWidth: '320px',
    width: '100%',
    boxShadow: '0 18px 30px rgba(77, 125, 240, 0.35)',
  },
  endCallButton: {
    background: 'linear-gradient(135deg, #ff5c7a, #ff8a8a)',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    padding: '18px 36px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    maxWidth: '320px',
    width: '100%',
    boxShadow: '0 18px 30px rgba(255, 92, 122, 0.3)',
  },
  phoneIcon: {
    marginRight: '12px',
  },
  statusIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '12px 0 24px 0',
  },
  indicatorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    marginBottom: '10px',
  },
  statusText: {
    fontSize: '15px',
    color: '#4d5a6b',
  },
  howItWorksContainer: {
    display: 'none',
  },
  howItWorksTitle: {
    display: 'none',
  },
  highlightContainer: {
    textAlign: 'left',
    backgroundColor: 'rgba(77, 125, 240, 0.08)',
    borderRadius: '20px',
    padding: '24px 26px',
    marginBottom: '10px',
  },
  highlightTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#264066',
    marginBottom: '16px',
  },
  highlightList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  highlightItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    color: '#3a5878',
    fontSize: '15px',
    lineHeight: 1.6,
  },
  highlightIcon: {
    fontSize: '22px',
    lineHeight: 1,
  },
  heroContent: {
    flex: 1,
    minWidth: '220px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    color: 'white',
    padding: '8px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '18px',
    letterSpacing: '0.5px',
  },
  heroTitle: {
    fontSize: '34px',
    fontWeight: '700',
    margin: '0 0 12px 0',
    color: 'white',
  },
  heroSubtitle: {
    fontSize: '16px',
    lineHeight: 1.6,
    margin: 0,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  heroImage: {
    width: '120px',
    height: '120px',
    borderRadius: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
  },
};

export default App;
