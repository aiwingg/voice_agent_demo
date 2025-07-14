import { render, screen } from '@testing-library/react';
import App from './App';

test('renders call button', () => {
  render(<App />);
  const btn = screen.getByText('🎤 Тестовый запуск');
  expect(btn).toBeInTheDocument();
});
