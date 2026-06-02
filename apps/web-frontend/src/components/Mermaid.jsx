import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

export default function Mermaid({ chart, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: '"Outfit", "Inter", sans-serif',
      maxTextSize: 900000,
      themeVariables: {
        primaryColor: '#ff8ba7',
        primaryTextColor: '#000000',
        primaryBorderColor: '#000000',
        lineColor: '#ffffff',
        secondaryColor: '#2dd4bf',
        tertiaryColor: '#c084fc',
        clusterBkg: '#1b1c2b',
        clusterBorder: '#000000',
        mainBkg: '#13141f',
        nodeBorder: '#000000',
        fontSize: '14px',
        edgeLabelBackground: '#09090e',
        clusterTextColor: '#ffffff'
      },
    });
    
    if (containerRef.current && chart) {
      mermaid.render(`mermaid-svg-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then((result) => {
          containerRef.current.innerHTML = result.svg;
        })
        .catch((e) => {
          console.error("Mermaid error", e);
        });
    }
  }, [chart]);

  return <div ref={containerRef} className={`mermaid ${className}`} />;
}
