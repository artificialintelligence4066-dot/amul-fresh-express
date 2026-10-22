import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Store from './Store'
import Admin from './Admin'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><Routes><Route path="/" element={<Store />} /><Route path="/admin" element={<Admin />} /></Routes></BrowserRouter>)
