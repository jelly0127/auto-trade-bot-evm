'use client';
import NavigationBar from '@/components/Navigation/NavigationBar';
import React from 'react';

const DomContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div >
      <NavigationBar />
      {children}
    </div>
  );
};

const Dom = ({ children }: { children: React.ReactNode }) => {
  return <DomContent>{children}</DomContent>;
};

export default Dom;
