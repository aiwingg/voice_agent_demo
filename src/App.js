import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

function App() {
  const [callActive, setCallActive] = useState(false);
  const retellClientRef = useRef(null);

  useEffect(() => {
    // Initialize Retell client
    retellClientRef.current = new RetellWebClient();

    const client = retellClientRef.current;

    client.on("call_started", () => {
      console.log("Call started");
      setCallActive(true);
    });

    client.on("call_ended", () => {
      console.log("Call ended");
      setCallActive(false);
    });

    client.on("agent_start_talking", () => {
      console.log("Agent started talking");
    });

    client.on("agent_stop_talking", () => {
      console.log("Agent stopped talking");
    });

    client.on("update", (update) => {
      console.log("Update:", update);
    });

    client.on("error", (error) => {
      console.error("An error occurred:", error);
      client.stopCall();
      setCallActive(false);
    });

    // Cleanup on component unmount
    return () => {
      client.stopCall();
    };
  }, []);

  // Fetch the web call token from your own server endpoint
  const createWebCall = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Optionally send additional data if needed
        body: JSON.stringify({ metadata: { demo: true } }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating web call on server:", error);
      throw error;
    }
  };

  // Start the call by obtaining the token from your server
  const startCall = async () => {
    try {
      const callData = await createWebCall();
      console.log("Call data:", callData);
      const accessToken = callData.access_token;
      await retellClientRef.current.startCall({
        accessToken,
        sampleRate: 24000,         // Optional: adjust as needed
        captureDeviceId: "default", // Optional: choose your mic device
        emitRawAudioSamples: false, // Optional: disable raw audio sample events
      });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        Voice Agent Demo<br />for<br />Street Rent a Xar
      </h1>
      <button onClick={startCall} disabled={callActive} style={styles.button}>
        {callActive ? "Voice Agent Active" : "🎤 Start Voice Agent"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '20vh'
  },
  title: {
    fontFamily: 'Arial, sans-serif',
    lineHeight: 1.5,
  },
  button: {
    fontSize: '18px',
    padding: '12px 24px',
    marginTop: '20px',
    cursor: 'pointer'
  }
};

export default App;