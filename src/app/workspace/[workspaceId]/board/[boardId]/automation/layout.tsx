"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const AutomationLayout = ({ children }: { children: React.ReactNode }) => {
  const { workspaceId, boardId } = useParams();

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-scroll">
        {/* Sidebar Header */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <div className="text-blue-500 text-2xl mr-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="7"
                y="9"
                width="10"
                height="2"
                rx="1"
                fill="currentColor"
              />
              <rect
                x="7"
                y="13"
                width="10"
                height="2"
                rx="1"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-blue-500 text-xl font-semibold">Automation</h1>
        </div>

        {/* Sidebar Navigation */}
        <nav className="p-4">
          {/* Automations Section */}
          <div className="mb-6">
            <h2 className="text-gray-700 font-medium mb-2">Automations</h2>
            <ul className="space-y-2">
              <li className="bg-blue-50 rounded">
                <Link
                  href={`/workspace/${workspaceId}/board/${boardId}/automation`}
                  className="flex items-center p-2 text-blue-600"
                >
                  <span className="mr-2">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 5H17M3 10H17M3 15H17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6 3L6 7M12 8L12 12M6 13L6 17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Custom Buttons Section */}
          {/* <div className="mb-6">
            <h2 className="text-gray-700 font-medium mb-2">Custom buttons</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded">
                  <span className="mr-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M7 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  Card buttons
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded">
                  <span className="mr-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M7 10H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  Board buttons
                </a>
              </li>
            </ul>
          </div> */}

          {/* App Automations Section */}
          {/* <div className="mb-6">
            <h2 className="text-gray-700 font-medium mb-2">App automations</h2>
            <ul className="space-y-2">
              <li>
                <a href="#" className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded">
                  <span className="mr-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 5C10.5523 5 11 4.55228 11 4C11 3.44772 10.5523 3 10 3C9.44772 3 9 3.44772 9 4C9 4.55228 9.44772 5 10 5Z" fill="currentColor"/>
                      <path d="M10 11C10.5523 11 11 10.5523 11 10C11 9.44772 10.5523 9 10 9C9.44772 9 9 9.44772 9 10C9 10.5523 9.44772 11 10 11Z" fill="currentColor"/>
                      <path d="M10 17C10.5523 17 11 16.5523 11 16C11 15.4477 10.5523 15 10 15C9.44772 15 9 15.4477 9 16C9 16.5523 9.44772 17 10 17Z" fill="currentColor"/>
                    </svg>
                  </span>
                  View apps
                </a>
              </li>
            </ul>
          </div> */}

          {/* More Section */}
          {/* <div className="mb-6">
            <h2 className="text-gray-700 font-medium">More</h2>
          </div> */}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-scroll pb-7">
        {children}
      </div>
    </div>
  );
};

export default AutomationLayout;
