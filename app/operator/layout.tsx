import { Suspense } from 'react';
import OperatorNav from '@/components/OperatorNav';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense
        fallback={<div className="h-[49px] border-b border-brand-rule bg-white" />}
      >
        <OperatorNav />
      </Suspense>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </>
  );
}
