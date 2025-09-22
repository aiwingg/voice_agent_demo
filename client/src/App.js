import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import './App.css';
import logo from './assets/host-assist-logo.svg';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Помощник готов к запуску.');
  const [errorMessage, setErrorMessage] = useState('');
  const retellClientRef = useRef(null);
  const isProcessingRef = useRef(false);

  const floatingOrbs = useMemo(
    () => [
      { top: '6%', left: '8%', size: 260, delay: '0s' },
      { top: '68%', left: '12%', size: 200, delay: '4s' },
      { top: '18%', left: '76%', size: 180, delay: '7s' },
      { top: '60%', left: '75%', size: 240, delay: '11s' },
      { top: '35%', left: '45%', size: 160, delay: '14s' },
    ],
    []
  );

  useEffect(() => {
    retellClientRef.current = new RetellWebClient();
    const client = retellClientRef.current;

    client.on('call_started', () => {
      setCallActive(true);
      setStatusMessage('Помощник на связи. Задайте вопрос гостя или расскажите задачу.');
      setErrorMessage('');
    });

    client.on('call_ended', () => {
      setCallActive(false);
      setStatusMessage('Разговор завершён. Нажмите кнопку, чтобы начать новый звонок.');
    });

    client.on('agent_start_talking', () => {
      setStatusMessage('Помощник отвечает на запрос.');
    });

    client.on('agent_stop_talking', () => {
      setStatusMessage('Помощник ждёт вашего ответа.');
    });

    client.on('update', (update) => {
      console.log('Обновление звонка:', update);
    });

    client.on('error', (error) => {
      console.error('Произошла ошибка звонка:', error);
      setErrorMessage('Не удалось поддерживать соединение. Попробуйте запустить помощника снова.');
      setStatusMessage('Соединение прервано.');
      setCallActive(false);
      client.stopCall();
    });

    return () => {
      client.stopCall();
    };
  }, []);

  const createWebCall = async () => {
    try {
      const response = await fetch('/api/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { источник: 'host-assist-demo' } }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при создании веб-звонка:', error);
      throw error;
    }
  };

  const startOrRestartCall = async () => {
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;
    setErrorMessage('');

    try {
      if (callActive) {
        setStatusMessage('Завершаем текущий разговор...');
        await retellClientRef.current.stopCall();
        setCallActive(false);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      setStatusMessage('Соединяем вас с цифровым ассистентом...');
      const callData = await createWebCall();
      const accessToken = callData.access_token;

      await retellClientRef.current.startCall({
        accessToken,
        sampleRate: 24000,
        captureDeviceId: 'default',
        emitRawAudioSamples: false,
      });
    } catch (error) {
      setStatusMessage('Попробуйте начать звонок ещё раз.');
      setErrorMessage('Не удалось установить соединение. Проверьте подключение и повторите попытку.');
      setCallActive(false);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const impactBubbles = [
    {
      title: 'Рост прямых бронирований',
      metric: '+28%',
      description: 'Конверсия входящих запросов в бронирования за первые 90 дней работы голосового ассистента.',
    },
    {
      title: 'Экономия времени команды',
      metric: '−42%',
      description: 'Сокращение рутинных звонков и сообщений для администраторов смены благодаря автоматическим ответам.',
    },
    {
      title: 'Уровень удовлетворённости гостей',
      metric: '9.4 / 10',
      description: 'Средняя оценка постояльцев по опросам после внедрения Host Assist в отелях-партнёрах.',
    },
  ];

  return (
    <div className="app">
      <div className="background-orbs" aria-hidden="true">
        {floatingOrbs.map((orb, index) => (
          <span
            key={index}
            className={`orb orb-${(index % 3) + 1}`}
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
              animationDelay: orb.delay,
            }}
          />
        ))}
      </div>

      <header className="header">
        <div className="branding">
          <img src={logo} alt="Логотип Host Assist" className="logo" />
          <div className="brand-text">
            <p className="brand-name">Host Assist</p>
            <p className="brand-tagline">Голосовой помощник для гостей</p>
          </div>
        </div>
        <p className="header-note">Служба заботливого приёма гостей с мгновенными ответами 24/7.</p>
      </header>

      <main className="main">
        <section className="call-panel">
          <span className="badge">Цифровой консьерж</span>
          <h1>Host Assist — голосовой помощник для ваших гостей</h1>
          <p className="lead">
            Автоматизируйте ответы на популярные вопросы и делегируйте рутинные задачи голосовому ассистенту, который говорит
            естественно, запоминает детали и поддерживает ваш стиль общения.
          </p>

          <div className="call-actions">
            <button onClick={startOrRestartCall} className={`primary-button ${callActive ? 'active' : ''}`}>
              {callActive ? '🔁 Перезапустить звонок' : '🎤 Начать звонок'}
            </button>
            <p className="status-text">{statusMessage}</p>
            {errorMessage && <p className="error-text">{errorMessage}</p>}
          </div>

          <ul className="benefits">
            <li>Мгновенно рассказывает о заселении, Wi-Fi и сервисах локации.</li>
            <li>Фиксирует пожелания гостей и передаёт их вашей команде.</li>
            <li>Работает на любом устройстве без установки приложений.</li>
          </ul>
        </section>

        <aside className="info-panel">
          {impactBubbles.map((bubble) => (
            <div className="info-card" key={bubble.title}>
              <div className="metric-value">{bubble.metric}</div>
              <h2>{bubble.title}</h2>
              <p>{bubble.description}</p>
            </div>
          ))}
        </aside>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Host Assist. Голосовой сервис для заботливых хозяев.</p>
      </footer>
    </div>
  );
}

export default App;
