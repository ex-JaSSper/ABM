import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { StoreProvider } from './store/store'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Hypotheses } from './pages/Hypotheses'
import { Signals } from './pages/Signals'
import { Companies } from './pages/Companies'
import { CompanyPage } from './pages/CompanyPage'
import { Contacts } from './pages/Contacts'
import { Tasks } from './pages/Tasks'

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'hypotheses', element: <Hypotheses /> },
      { path: 'signals', element: <Signals /> },
      { path: 'companies', element: <Companies /> },
      { path: 'companies/:id', element: <CompanyPage /> },
      { path: 'contacts', element: <Contacts /> },
      { path: 'tasks', element: <Tasks /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </React.StrictMode>,
)
