import React, { Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const NavigationBar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const renderRouter = () => {
    const routes = [
      { path: '/', label: 'trade' },
      { path: '/wallet', label: 'wallet' },
      { path: '/setting', label: 'setting' },
    ];

    return (
      <>
        {routes.map((route) => (
          <button
            key={route.path}
            onClick={() => {
              router.push(route.path);
            }}
            className={`col-span-1 cursor-pointer flex items-center gap-x-2 text-nowrap pb-2 lg:border-none lg:border-transparent lg:pb-0 ${pathname === route.path ? 'text-[#EEEEEE]' : 'text-[#B1B1B1]'
              }`}
          >
            {route.path === pathname && <div className="h-2 w-2 rounded-full bg-[#FCD535]" />}
            <p className="font-medium">{route.label}</p>
          </button>
        ))}
      </>
    );
  };

  return (
    <Suspense fallback={<></>}>
      <div className="sticky top-0 z-50 w-full border-b border-white/10">
        <div className="flex h-16 w-full items-center gap-x-16 px-4 backdrop-blur-md sm:px-5 md:px-6 lg:px-8">
          <Link
            href={'/'}
            className="flex items-center text-nowrap font-title text-[20px] font-bold uppercase leading-5 tracking-wide text-white md:text-[28px]"
          >
            Auto Trade Bot on EVM
          </Link>

          <div className="flex items-center gap-x-10">{renderRouter()}</div>
        </div>
      </div>
    </Suspense>
  );
};

export default NavigationBar;
