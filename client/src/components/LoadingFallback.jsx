import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingFallback with optional minimum-delay logic to prevent
 * flash of loading spinner on ultra-fast network connections.
 */
export const LoadingFallback = ({ message = 'Loading component chunk...', minDelay = 200 }) => {
  const [show, setShow] = useState(minDelay === 0);

  useEffect(() => {
    if (minDelay === 0) return;
    const timer = setTimeout(() => setShow(true), minDelay);
    return () => clearTimeout(timer);
  }, [minDelay]);

  if (!show) return null;

  return (
    <div className="loading-fallback-container">
      <div className="loading-spinner-ring"></div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>
        {message}
      </h3>
      <p style={{ fontSize: '13px', color: '#64748b' }}>
        Optimized with <code style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px' }}>React.lazy()</code> & Code-Splitting
      </p>
    </div>
  );
};

export default LoadingFallback;
