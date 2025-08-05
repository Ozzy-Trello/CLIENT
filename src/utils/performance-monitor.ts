/**
 * Performance monitoring utilities to track optimization impact
 */
import React from "react";

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === "development";
  }

  /**
   * Start tracking a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End tracking a performance metric
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log the metric
    console.log(
      `🚀 Performance: ${name} took ${duration.toFixed(2)}ms`,
      metric.metadata
    );

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<
    string,
    { count: number; totalTime: number; avgTime: number }
  > {
    const summary: Record<
      string,
      { count: number; totalTime: number; avgTime: number }
    > = {};

    this.metrics.forEach((metric) => {
      if (metric.duration !== undefined) {
        if (!summary[metric.name]) {
          summary[metric.name] = { count: 0, totalTime: 0, avgTime: 0 };
        }
        summary[metric.name].count++;
        summary[metric.name].totalTime += metric.duration;
        summary[metric.name].avgTime =
          summary[metric.name].totalTime / summary[metric.name].count;
      }
    });

    return summary;
  }
}

// Create a singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(metricName, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Hook for measuring React component render performance
 */
export function useMeasureRender(componentName: string) {
  if (process.env.NODE_ENV === "development") {
    performanceMonitor.start(`${componentName}-render`);

    // Use useEffect to measure render completion
    React.useEffect(() => {
      performanceMonitor.end(`${componentName}-render`);
    });
  }
}

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window !== "undefined" && "performance" in window) {
    // Track Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log("🎯 LCP:", lastEntry.startTime);
    }).observe({ entryTypes: ["largest-contentful-paint"] });

    // Track First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as any; // Type assertion for FID-specific properties
        console.log("⚡ FID:", fidEntry.processingStart - fidEntry.startTime);
      });
    }).observe({ entryTypes: ["first-input"] });

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log("📐 CLS:", clsValue);
        }
      });
    }).observe({ entryTypes: ["layout-shift"] });
  }
}
