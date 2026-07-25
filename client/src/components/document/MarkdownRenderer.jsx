import React from 'react';

const MarkdownRenderer = ({ markdown }) => {
  if (!markdown) return <p className="text-slate-500 italic text-xs">Blank document.</p>;

  // Simple and lightweight custom markdown compiler logic
  const parseMarkdown = (text) => {
    // 1. Escape HTML to prevent script injections
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Code blocks (fenced ```)
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre class="bg-slate-950 p-4 rounded-lg text-xs font-mono text-slate-300 border border-slate-900 my-3 overflow-x-auto"><code>${code.trim()}</code></pre>`;
    });

    // 3. Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-xs text-brand-purple font-mono">$1</code>');

    // 4. Bold formatting (**bold**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

    // 5. Italics formatting (*italics*)
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');

    // 6. Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-white mt-4 mb-2 font-display">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-5 mb-2.5 font-display border-b border-slate-900 pb-1">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-3 font-display">$1</h1>');

    // 7. Blockquotes (> quote)
    html = html.replace(/^\>&nbsp;(.*$)/gim, '<blockquote class="border-l-4 border-l-brand-purple pl-4 italic text-slate-400 my-4 bg-brand-purple/5 p-2 rounded-r-lg">$1</blockquote>');
    html = html.replace(/^\&gt;\s(.*$)/gim, '<blockquote class="border-l-4 border-l-brand-purple pl-4 italic text-slate-400 my-4 bg-brand-purple/5 p-2 rounded-r-lg">$1</blockquote>');

    // 8. Bullet lists (* list items)
    // Parse list items
    html = html.replace(/^\s*[\-\*]\s(.*$)/gim, '<li class="ml-4 list-disc text-slate-300 leading-relaxed">$1</li>');
    // Wrap consecutive <li> tags in a <ul> list container
    // A simple way is to replace list items wraps or just let browser layout list items
    
    // 9. Line breaks paragraphs
    const paragraphs = html.split(/\n\n+/);
    const parsedParagraphs = paragraphs.map(p => {
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<li')) {
        return p;
      }
      return `<p class="text-sm text-slate-350 leading-relaxed mb-3">${p.replace(/\n/g, '<br />')}</p>`;
    });

    return parsedParagraphs.join('\n');
  };

  const compiledHtml = parseMarkdown(markdown);

  return (
    <div 
      className="markdown-body text-left p-6 font-sans select-text select-all"
      dangerouslySetInnerHTML={{ __html: compiledHtml }}
    />
  );
};

export default MarkdownRenderer;
