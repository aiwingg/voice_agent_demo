import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [telegramId, setTelegramId] = useState('');
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
        /* ваши keyframes и стили объектов остаются без изменений */
      `}</style>

      <div style={styles.card}>
        <h1 style={styles.title}>Голосовой Агент<br />ВТД</h1>
        {telegramId ? (
          <button onClick={startOrRestartCall} className="call-button" style={styles.button}>
            {callActive ? '🎤 Перезапустить Голосового Агента' : '🎤 Запустить Голосового Агента'}
          </button>
        ) : (
          <div>
            <p style={styles.warningText}>
              Отсутствует ID Telegram. Пожалуйста, откройте через Telegram.
            </p>
            <button onClick={startOrRestartCall} className="call-button" style={{ ...styles.button, opacity: 0.7 }}>
              🎤 Тестовый запуск
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  appContainer: {
    /* ...ваши стили... */
  },
  card: {
    /* ...ваши стили... */
  },
  title: {
    /* ...ваши стили... */
  },
  button: {
    /* ...ваши стили... */
  },
  warningText: {
    /* ...ваши стили... */
  },
};

export default App;
