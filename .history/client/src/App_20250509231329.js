import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState('idle'); // idle, listening, speaking
  const retellClientRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
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

  // Fetch the web call token from your own server endpoint
  const createWebCall = async () => {
    try {
      const response = await fetch('/api/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { demo: true } }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
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
    switch (agentStatus) {
      case 'speaking':
        return 'Агент говорит';
      case 'listening':
        return 'Агент слушает';
      case 'connecting':
        return 'Подключение...';
      default:
        return 'Не активен';
    }
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
      `}</style>

      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={styles.logo}>МТТ</span>
          <span style={styles.titleText}>Голосовой Агент</span>
        </h1>
        
        {renderStatusIndicator()}
        
        <button onClick={startOrRestartCall} className="call-button" style={{
          ...styles.button,
          background: callActive 
            ? 'linear-gradient(90deg, #d32f2f, #f44336)' 
            : 'linear-gradient(90deg, #0044CC, #0056D2)'
        }}>
          {callActive ? '🎤 Перезапустить Голосового Агента' : '🎤 Запустить Голосового Агента'}
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
};

export default App;