import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('retell-client-js-sdk', () => {
  class MockRetellWebClient {
    constructor() {
      this.handlers = {};
      this.startCall = jest.fn();
      this.stopCall = jest.fn();
    }

    on(event, handler) {
      this.handlers[event] = handler;
    }
  }

  return {
    RetellWebClient: MockRetellWebClient,
  };
});

test('отображает панель цифрового консьержа', () => {
  render(<App />);
  expect(screen.getByText(/цифровой консьерж/i)).toBeInTheDocument();
  expect(screen.getByText(/начать звонок/i)).toBeInTheDocument();
});
