import React, { useEffect, useRef } from "react";

export default function ErrorToast({ message, onDismiss }) {
  const timer = useRef(null);

  useEffect(() => {
    if (message) {
      clearTimeout(timer.current);
      timer.current = setTimeout(onDismiss, 6000);
    }
    return () => clearTimeout(timer.current);
  }, [message, onDismiss]);

  if (!message) return null;

  return <div className="error-toast">{message}</div>;
}
