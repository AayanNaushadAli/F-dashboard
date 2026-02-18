import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { TradingProvider } from './context/TradingContext';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Market = lazy(() => import('./components/Market'));
const Login = lazy(() => import('./components/Login'));
const Profile = lazy(() => import('./components/Profile'));
const QuantDashboard = lazy(() => import('./components/QuantDashboard'));
const News = lazy(() => import('./components/News'));

function App() {
  return (
    <ErrorBoundary>
      <TradingProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-slate-900 text-slate-200 grid place-items-center">Loading...</div>}>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/market"
                element={
                  <ProtectedRoute>
                    <Market />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login initialMode="LOGIN" />} />
              <Route path="/signup" element={<Login initialMode="SIGNUP" />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quant"
                element={
                  <ProtectedRoute>
                    <QuantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/news"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <News />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TradingProvider>
    </ErrorBoundary>
  );
}

export default App;
