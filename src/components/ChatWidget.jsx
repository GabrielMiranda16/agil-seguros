import React, { useEffect } from 'react';

const ChatWidget = () => {
  useEffect(() => {
    if (!document.querySelector('script[src="https://agil-seguros.fly.dev/static/widget.js"]')) {
      const script = document.createElement('script');
      script.src = "https://agil-seguros.fly.dev/static/widget.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
};

export default ChatWidget;