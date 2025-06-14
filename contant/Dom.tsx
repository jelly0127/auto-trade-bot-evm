'use client';
import NavigationBar from '@/components/Navigation/NavigationBar';
import ApiStatus from '@/components/Trade/ApiStatus';
import NetworkStatusComponent from '@/components/Trade/NetworkStatus';
import React from 'react';

const DomContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div >
      <NavigationBar />
      {/* 网络状态 */}
      <div className=' fixed top-[80px] right-3 w-[120px]'>
        <NetworkStatusComponent className="w-[120px] z-[999]" />
        {/* API状态监控 */}
        {/* <ApiStatus className="w-80" /> */}
      </div>
      {children}
    </div>
  );
};

const Dom = ({ children }: { children: React.ReactNode }) => {
  return <DomContent>{children}</DomContent>;
};

export default Dom;
