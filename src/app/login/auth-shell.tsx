"use client";

import type { ReactNode } from "react";

import ProductionSection from "@components/production-section";

interface AuthShellProps {
  title: string;
  children: ReactNode;
}

export default function AuthShell({ title, children }: AuthShellProps) {
  return (
    <div className="min-h-screen">
      <div className="lg:hidden">
        <ProductionSection variant="mobile" />
        <div className="flex flex-col justify-center items-center p-8 bg-white min-h-[calc(100vh-16rem)]">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                {title}
              </h1>
            </div>
            {children}
          </div>
        </div>
      </div>

      <div className="hidden lg:block min-h-screen relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/background-login.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-black/20">
            <div className="flex justify-center items-center min-h-screen p-8">
              <div className="flex bg-white rounded-4xl shadow-2xl overflow-hidden max-w-4xl w-full">
                <div className="flex-1 p-8 max-w-md">
                  <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                      {title}
                    </h1>
                  </div>
                  {children}
                </div>
                <div className="hidden lg:block flex-1 bg-gray-50">
                  <ProductionSection variant="desktop" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
