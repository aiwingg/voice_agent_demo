import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import './App.css';
import logo from './assets/host-assist-logo.svg';

function App() {
  const [callActive, setCallActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Помощник готов к запуску.');
  const [errorMessage, setErrorMessage] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyInfo, setCompanyInfo] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState('');
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramValue =
      params.get('companyId') ||
      params.get('company_id') ||
      params.get('company') ||
      '';
    if (paramValue) {
      setCompanyId(paramValue.trim());
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadCompanyInfo(selectedCompanyId) {
      if (!selectedCompanyId) {
        setCompanyInfo(null);
        setCompanyError('');
        return;
      }

      setCompanyLoading(true);
      setCompanyError('');

      try {
        const response = await fetch(`/api/company-config?companyId=${encodeURIComponent(selectedCompanyId)}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Не найдена конфигурация компании.');
          }
          throw new Error(`Ошибка загрузки конфигурации: ${response.status}`);
        }

        const data = await response.json();
        if (!ignore) {
          setCompanyInfo(data);
        }
      } catch (error) {
        console.error('Не удалось получить данные компании:', error);
        if (!ignore) {
          setCompanyInfo(null);
          setCompanyError('Не удалось получить настройки компании. Будет использован помощник по умолчанию.');
        }
      } finally {
        if (!ignore) {
          setCompanyLoading(false);
        }
      }
    }

    loadCompanyInfo(companyId);

    return () => {
      ignore = true;
    };
  }, [companyId]);

  const createWebCall = async () => {
    try {
      const payload = {
        metadata: {
          источник: 'host-assist-demo'
        }
      };

      if (companyId) {
        payload.companyId = companyId;
      }

      if (companyInfo?.metadata) {
        payload.metadata = {
          ...companyInfo.metadata,
          ...payload.metadata
        };
      }

      if (companyInfo?.agentId) {
        payload.agentId = companyInfo.agentId;
      }

      if (companyInfo?.retell_llm_dynamic_variables) {
        payload.dynamicVariables = companyInfo.retell_llm_dynamic_variables;
      }

      const response = await fetch('/api/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

    if (companyLoading) {
      setStatusMessage('Дождитесь загрузки настроек компании...');
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
            <button
              onClick={startOrRestartCall}
              className={`primary-button ${callActive ? 'active' : ''}`}
              disabled={companyLoading}
            >
              {callActive ? '🔁 Перезапустить звонок' : '🎤 Начать звонок'}
            </button>
            {companyId && (
              <p className="company-status">
                {companyLoading && `Загружаем настройки для компании ${companyId}...`}
                {!companyLoading && companyInfo && (
                  <>
                    Настройки загружены для компании «{companyInfo.companyName || companyId}»
                    {companyInfo.source === 'google-sheets' && <span className="company-source"> · Google Sheets</span>}
                    {companyInfo.source === 'fallback' && <span className="company-source fallback"> · демо-профиль</span>}
                  </>
                )}
                {!companyLoading && companyError && <span className="company-error">{companyError}</span>}
              </p>
            )}
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
          <div className="info-card metric-card metric-card-blue">
            <span className="metric-value">63%</span>
            <h2>запросов гостей закрывается автоматически</h2>
            <p>Host Assist снимает рутину с ресепшн и освобождает время для персонализированного сервиса.</p>
          </div>

          <div className="info-card metric-card metric-card-green">
            <span className="metric-value">11&nbsp;сек.</span>
            <h2>среднее время первого ответа</h2>
            <p>Гости получают мгновенную реакцию, что повышает оценку сервиса и снижает количество повторных звонков.</p>
          </div>

          <div className="info-card metric-card metric-card-gold">
            <span className="metric-value">18&nbsp;часов</span>
            <h2>экономии труда в неделю</h2>
            <p>Команда тратит меньше времени на типовые вопросы и концентрируется на задачах с высокой ценностью.</p>
          </div>
        </aside>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Host Assist. Голосовой сервис для заботливых хозяев.</p>
      </footer>
    </div>
  );
}

export default App;
