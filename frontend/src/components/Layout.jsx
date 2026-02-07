import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Import the Header component

const Layout = () => {
  return (
    <div>
      <Header /> {/* A global navbar could go here */}
      <main>
        <Outlet />
      </main>
      {/* A global footer could go here */}
    </div>
  );
};

export default Layout;
