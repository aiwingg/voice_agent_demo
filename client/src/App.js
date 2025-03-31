import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

function App() {
  const [callActive, setCallActive] = useState(false);
  const retellClientRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Initialize the Retell client
    retellClientRef.current = new RetellWebClient();
    const client = retellClientRef.current;

    client.on('call_started', () => {
      console.log('Call started');
    });

    client.on('call_ended', () => {
      console.log('Call ended');
    });

    client.on('agent_start_talking', () => {
      console.log('Agent started talking');
    });

    client.on('agent_stop_talking', () => {
      console.log('Agent stopped talking');
    });

    client.on('update', (update) => {
      console.log('Update:', update);
    });

    client.on('error', (error) => {
      console.error('An error occurred:', error);
      client.stopCall();
      setCallActive(false);
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
        await retellClientRef.current.stopCall();
        // Small delay to ensure the call stops completely
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      setCallActive(true);
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
    } finally {
      isProcessingRef.current = false;
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
      `}</style>

      <div style={styles.card}>
        <h1 style={styles.title}>Voice Agent Demo<br />for<br />Thrifty Car Rental</h1>
        <button onClick={startOrRestartCall} className="call-button" style={styles.button}>
          {callActive ? '🎤 Restart Voice Agent' : '🎤 Start Voice Agent'}
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
    borderRadius: '15px',
    padding: '40px 60px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    animation: 'fadeIn 1s ease-in-out',
    zIndex: 1
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '20px',
    color: '#333',
    textShadow: '1px 1px 3px rgba(0,0,0,0.2)',
  },
  button: {
    fontSize: '1.2rem',
    padding: '15px 30px',
    borderRadius: '30px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(90deg, #0044CC, #0056D2)',
    color: '#fff',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
};

export default App;