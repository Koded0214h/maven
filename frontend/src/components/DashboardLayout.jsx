import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Import the Header component

const DashboardLayout = () => {
  return (
    <div>
      <Header />
      <h1>Dashboard Layout</h1>
      <Outlet />
    </div>
  );
};

export default DashboardLayout;