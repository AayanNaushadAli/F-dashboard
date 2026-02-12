import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Market from './components/Market';
import Login from './components/Login';
import Profile from './components/Profile';
import ErrorBoundary from './components/ErrorBoundary';
import { TradingProvider } from './context/TradingContext';

function App() {
  return (
    <ErrorBoundary>
      <TradingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/market" element={<Market />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </BrowserRouter>
      </TradingProvider>
    </ErrorBoundary>
  );
}

export default App;
