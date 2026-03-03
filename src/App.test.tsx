import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ENTER DUNGEON button', () => {
  render(<App />);
  const buttonElement = screen.getByText(/ENTER DUNGEON/i);
  expect(buttonElement).toBeInTheDocument();
});
