import React from 'react'
import { Lock, Settings, Key, Info } from 'lucide-react'

/**
 * Professional File Icon Utility for Aeres IDE
 * Provides SVG icons and colors for various file types and themes.
 */

const FILE_ICON_MAP = {
  // Languages
  js: { color: '#f7df1e', label: 'JS', devicon: 'javascript/javascript-original.svg' },
  jsx: { color: '#61dafb', label: 'JSX', devicon: 'react/react-original.svg' },
  ts: { color: '#3178c6', label: 'TS', devicon: 'typescript/typescript-original.svg' },
  tsx: { color: '#3178c6', label: 'TSX', devicon: 'react/react-original.svg' },
  html: { color: '#e34c26', label: 'HTML', devicon: 'html5/html5-original.svg' },
  css: { color: '#264de4', label: 'CSS', devicon: 'css3/css3-original.svg' },
  scss: { color: '#cd6799', label: 'SCSS', devicon: 'sass/sass-original.svg' },
  less: { color: '#1d365d', label: 'LESS', devicon: 'less/less-plain-wordmark.svg' },
  py: { color: '#3776ab', label: 'PY', devicon: 'python/python-original.svg' },
  go: { color: '#00add8', label: 'GO', devicon: 'go/go-original.svg' },
  rs: { color: '#dea584', label: 'RS', devicon: 'rust/rust-original.svg' },
  java: { color: '#b07219', label: 'JAVA', devicon: 'java/java-original.svg' },
  cpp: { color: '#f34b7d', label: 'C++', devicon: 'cplusplus/cplusplus-original.svg' },
  c: { color: '#555555', label: 'C', devicon: 'c/c-original.svg' },
  cs: { color: '#178600', label: 'C#', devicon: 'csharp/csharp-original.svg' },
  php: { color: '#4f5d95', label: 'PHP', devicon: 'php/php-original.svg' },
  rb: { color: '#701516', label: 'RB', devicon: 'ruby/ruby-original.svg' },
  sql: { color: '#e38c00', label: 'SQL', devicon: 'mysql/mysql-original.svg' },
  sh: { color: '#89e051', label: 'SH', devicon: 'bash/bash-original.svg' },
  bash: { color: '#89e051', label: 'SH', devicon: 'bash/bash-original.svg' },
  yml: { color: '#cb171e', label: 'YML', devicon: 'yaml/yaml-original.svg' },
  yaml: { color: '#cb171e', label: 'YML', devicon: 'yaml/yaml-original.svg' },
  json: { color: '#fbb117', label: 'JSON' }, // No dedicated json devicon that looks good in tree, fallback to custom
  md: { color: '#083fa1', label: 'MD', devicon: 'markdown/markdown-original.svg' },
  mdx: { color: '#fcb32c', label: 'MDX', devicon: 'markdown/markdown-original.svg' },
  vue: { color: '#41b883', label: 'VUE', devicon: 'vuejs/vuejs-original.svg' },
  svelte: { color: '#ff3e00', label: 'SVELTE', devicon: 'svelte/svelte-original.svg' },
  dart: { color: '#00d2b8', label: 'DART', devicon: 'dart/dart-original.svg' },
  swift: { color: '#ffac45', label: 'SWIFT', devicon: 'swift/swift-original.svg' },
  kt: { color: '#f18e33', label: 'KT', devicon: 'kotlin/kotlin-original.svg' },
  
  // Special naming
  dockerfile: { color: '#384d54', label: 'DOCKER', devicon: 'docker/docker-original.svg' },
  makefile: { color: '#427819', label: 'MAKE' },
}

export function getFileIcon(filename, theme, iconTheme = 'material-icons') {
  const ext = filename.split('.').pop().toLowerCase()
  const name = filename.toLowerCase()

  if (iconTheme === 'none') return null

  if (iconTheme === 'minimal') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    )
  }

  // Special cases for exact filenames
  if (name === 'package.json') return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/npm/npm-original-wordmark.svg" className="w-3.5 h-3.5 shrink-0" alt="npm" />
  if (name === 'package-lock.json') return <span className="text-[13px] shrink-0" title="Lock"><Lock size={12} /></span>
  if (name === '.gitignore') return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg" className="w-3.5 h-3.5 shrink-0" alt="git" />
  if (name === 'readme.md') return <span className="text-[13px] shrink-0 text-blue-400" title="Readme"><Info size={12} /></span>
  if (name.includes('config')) return <span className="text-[13px] shrink-0" title="Config"><Settings size={12} /></span>
  if (name.includes('.env')) return <span className="text-[13px] shrink-0 text-yellow-500" title="Env"><Key size={12} /></span>

  const spec = FILE_ICON_MAP[ext] || FILE_ICON_MAP[name]

  if (!spec) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    )
  }

  // Official Devicon VS Code Style Logo
  if (spec.devicon) {
    return (
      <img 
        src={`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${spec.devicon}`} 
        className="w-3.5 h-3.5 shrink-0"
        alt={spec.label}
        onError={(e) => {
          // Fallback to minimal SVG if network fails
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextElementSibling.style.display = 'block'
        }}
      />
    )
  }

  // Fallback Professional SVG Document Icon for files without specific devicon mapping (e.g JSON)
  return (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path 
        d="M14.5 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V7.5L14.5 2Z" 
        fill={spec.color} 
        fillOpacity="0.15" 
        stroke={spec.color} 
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path 
        d="M14 2V8H20" 
        stroke={spec.color} 
        strokeWidth="1.5" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text 
        x="12" 
        y="16" 
        fontSize="5" 
        fontWeight="800" 
        fontFamily="sans-serif" 
        fill={spec.color} 
        textAnchor="middle" 
        dominantBaseline="middle"
      >
        {spec.label.substring(0, 3)}
      </text>
    </svg>
  )
}
