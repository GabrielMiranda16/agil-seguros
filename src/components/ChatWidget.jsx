import React, { useEffect } from 'react';

const ChatWidget = () => {
  useEffect(() => {
    if (window.__giChatLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://agil-seguros.fly.dev/static/widget.js';
    script.async = true;
    script.onerror = () => console.error('Gi Chat Widget: não foi possível conectar ao servidor.');
    document.body.appendChild(script);
  }, []);

  return null;
};

export default ChatWidget;
