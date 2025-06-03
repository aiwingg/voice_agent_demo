import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import OrderHistory from './OrderHistory';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [telegramId, setTelegramId] = useState('');
  const [manualTelegramId, setManualTelegramId] = useState('');
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const retellClientRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Подключаем Telegram Web App SDK
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      const { user } = tg.initDataUnsafe || {};
      if (user && user.id) {
        setTelegramId(String(user.id));
        console.log('Telegram user ID:', user.id);
      } else {
        console.warn('Не удалось получить user.id из initDataUnsafe');
      }
    } else {
      console.warn('Telegram WebApp JS SDK не найден');
    }

    // Инициализируем Retell клиент
    retellClientRef.current = new RetellWebClient();
    const client = retellClientRef.current;

    client.on('call_started',    () => console.log('Call started'));
    client.on('call_ended',      () => console.log('Call ended'));
    client.on('agent_start_talking', () => console.log('Agent started talking'));
    client.on('agent_stop_talking',  () => console.log('Agent stopped talking'));
    client.on('update', update => console.log('Update:', update));
    client.on('error', error => {
      console.error('An error occurred:', error);
      client.stopCall();
      setCallActive(false);
    });

    return () => { client.stopCall(); };
  }, []);

  const createWebCall = async () => {
    const response = await fetch('/api/create-web-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  };

  const startOrRestartCall = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      if (callActive) {
        setCallActive(false);
        await retellClientRef.current.stopCall();
        await new Promise(r => setTimeout(r, 500));
      }
      setCallActive(true);
      setIsMuted(false); // Reset mute state on new call
      const callData = await createWebCall();
      await retellClientRef.current.startCall({
        accessToken: callData.access_token,
        sampleRate: 24000,
        captureDeviceId: 'default',
        emitRawAudioSamples: false,
      });
    } catch (err) {
      console.error('Error starting/restarting call:', err);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleManualIdSubmit = (e) => {
    e.preventDefault();
    if (manualTelegramId.trim()) {
      setTelegramId(manualTelegramId.trim());
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately after getting permission
      setHasMicrophonePermission(true);
    } catch (error) {
      setHasMicrophonePermission(false);
    }
  };

  const handleMuteToggle = () => {
    if (!retellClientRef.current) return;
    if (!isMuted) {
      retellClientRef.current.mute();
      setIsMuted(true);
    } else {
      retellClientRef.current.unmute();
      setIsMuted(false);
    }
  };

  return (
    <div style={styles.appContainer}>
      <div className="dynamic-background">
        {Array.from({ length: 70 }).map((_, i) => {
          const shapeClass = `object${(i % 7) + 1}`;
          const randomTop = `${Math.random() * 100}%`;
          const randomLeft = `${Math.random() * 100}%`;
          const inlineStyle = {
            top: randomTop,
            left: randomLeft,
            animationDuration: `${20 + Math.random() * 20}s`,
            animationDelay: `${Math.random() * 10}s`
          };
          return <div key={i} className={`object ${shapeClass}`} style={inlineStyle} />;
        })}
      </div>

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
        .object7 {
          width: 40px;
          height: 40px;
          animation-name: circleBounce;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>

      <div style={styles.card}>
        <h1 style={styles.title}>Голосовой Агент<br />ВТД</h1>
        {telegramId ? (
          <>
            {!hasMicrophonePermission && (
              <button 
                onClick={requestMicrophonePermission} 
                style={styles.permissionButton}
              >
                🎤 Разрешить использование микрофона
              </button>
            )}
            <button 
              onClick={startOrRestartCall} 
              className="call-button" 
              style={{...styles.button, opacity: hasMicrophonePermission ? 1 : 0.5}}
              disabled={!hasMicrophonePermission}
            >
              {callActive ? '🎤 Перезапустить Голосового Агента' : '🎤 Запустить Голосового Агента'}
            </button>
            {callActive && hasMicrophonePermission && (
              <button
                onClick={handleMuteToggle}
                style={{ ...styles.button, marginTop: 10, background: isMuted ? 'linear-gradient(90deg, #FF6B6B, #FF8E8E)' : 'linear-gradient(90deg, #0044CC, #0056D2)' }}
              >
                {isMuted ? '🔊 Включить микрофон' : '🔇 Отключить микрофон'}
              </button>
            )}
          </>
        ) : (
          <div>
            <p style={styles.warningText}>
              Отсутствует ID Telegram. Пожалуйста, введите ID вручную или откройте через Telegram.
            </p>
            <form onSubmit={handleManualIdSubmit} style={styles.form}>
              <input
                type="text"
                value={manualTelegramId}
                onChange={(e) => setManualTelegramId(e.target.value)}
                placeholder="Введите Telegram ID"
                style={styles.input}
              />
              <button type="submit" style={styles.submitButton}>
                Подтвердить
              </button>
            </form>
            <button onClick={startOrRestartCall} className="call-button" style={{ ...styles.button, opacity: 0.7 }}>
              🎤 Тестовый запуск
            </button>
          </div>
        )}

        {/* Order History Section */}
        <div style={styles.historySection}>
          <OrderHistory telegramId={telegramId} />
        </div>
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
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: '95vw',
    maxHeight: '95vh',
    overflow: 'auto',
  },
  historySection: {
    marginTop: '40px',
    width: '100%',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '20px',
    color: '#333',
    textShadow: '1px 1px 3px rgba(0,0,0,0.2)',
  },
  warningText: {
    color: '#e74c3c',
    marginBottom: '15px',
    fontSize: '1rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px',
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  submitButton: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#0044CC',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  submitButtonHover: {
    background: '#0056D2',
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
  permissionButton: {
    fontSize: '1.2rem',
    padding: '15px 30px',
    borderRadius: '30px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(90deg, #FF6B6B, #FF8E8E)',
    color: '#fff',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    marginBottom: '15px',
  },
};

export default App;
