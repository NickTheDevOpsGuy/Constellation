// src/app/main.tsx
import './styles/global.css'; // ← make sure this exists (see below)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Layout from './components/Layout';
import ImportPage from './pages/ImportPage';
import StatsPage from './pages/StatsPage';
import GraphPage from './pages/GraphPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ImportPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'graph', element: <GraphPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
