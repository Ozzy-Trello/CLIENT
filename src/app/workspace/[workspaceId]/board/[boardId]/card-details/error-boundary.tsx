"use client";

import { Button } from "antd";
import React from "react";

interface Props {
  onReset?: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CardDetailErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[CardDetail] render error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="text-base font-semibold text-gray-800">
            Failed to load card detail
          </div>
          <div className="text-sm text-gray-500 max-w-md">
            {this.state.error?.message ||
              "Something went wrong while rendering this card."}
          </div>
          <div className="flex gap-2">
            <Button type="primary" onClick={this.handleReset}>
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default CardDetailErrorBoundary;
