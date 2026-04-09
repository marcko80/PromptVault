// PromptVault — Content Script
// Inietta prompt nelle interfacce AI supportate (Claude, ChatGPT, Gemini, Perplexity, Mistral)

'use strict';

// Selettori per ogni piattaforma, in ordine di priorità
const PLATFORM_SELECTORS = {
  'claude.ai': [
    '.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"].ProseMirror',
    '[data-placeholder] div[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  'chat.openai.com': [
    '#prompt-textarea',
    'div[id="prompt-textarea"][contenteditable="true"]',
    'div[contenteditable="true"]',
    'textarea',
  ],
  'chatgpt.com': [
    '#prompt-textarea',
    'div[contenteditable="true"]',
    'textarea',
  ],
  'gemini.google.com': [
    '.ql-editor[contenteditable="true"]',
    'rich-textarea .ql-editor',
    'div[contenteditable="true"]',
  ],
  'perplexity.ai': [
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"]',
  ],
  'www.perplexity.ai': [
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"]',
  ],
  'mistral.ai': [
    'textarea',
    'div[contenteditable="true"]',
  ],
  'chat.mistral.ai': [
    'textarea',
    'div[contenteditable="true"]',
  ],
};

// ── Trova l'elemento input attivo sulla pagina ──
function findInputElement() {
  const host = window.location.hostname;
  const selectors = PLATFORM_SELECTORS[host] || [
    'textarea[placeholder]',
    'div[contenteditable="true"]',
    'textarea',
  ];

  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      if (isVisible(el) && !isReadOnly(el)) return el;
    }
  }
  return null;
}

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0'
  );
}

function isReadOnly(el) {
  return el.readOnly || el.disabled || el.getAttribute('aria-readonly') === 'true';
}

// ── Inietta il testo nell'elemento trovato ──
function injectText(text) {
  const el = findInputElement();
  if (!el) {
    console.warn('PromptVault: nessun elemento input trovato su', window.location.hostname);
    return false;
  }

  try {
    el.focus();

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      injectIntoTextarea(el, text);
    } else if (el.contentEditable === 'true') {
      injectIntoContentEditable(el, text);
    }

    return true;
  } catch (err) {
    console.error('PromptVault: errore durante l\'injection:', err);
    return false;
  }
}

// Per <textarea> e <input> standard
function injectIntoTextarea(el, text) {
  // Usa il setter nativo per bypassare React/Vue
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

  if (nativeSetter) {
    nativeSetter.call(el, text);
  } else {
    el.value = text;
  }

  // Dispatcha eventi necessari per i framework
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  // Posiziona il cursore alla fine
  el.selectionStart = text.length;
  el.selectionEnd = text.length;
}

// Per div[contenteditable] — Claude, ChatGPT, Gemini
function injectIntoContentEditable(el, text) {
  el.focus();

  // Seleziona tutto il contenuto esistente
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  selection?.removeAllRanges();
  selection?.addRange(range);

  // execCommand è il metodo più affidabile nei content editable
  // perché funziona con ProseMirror, Quill, e Draft.js
  const inserted = document.execCommand('insertText', false, text);

  if (!inserted) {
    // Fallback diretto per browser che non supportano execCommand
    el.textContent = '';
    const textNode = document.createTextNode(text);
    el.appendChild(textNode);

    // Posiziona cursore alla fine
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(newRange);

    // Dispatcha InputEvent per notificare il framework
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text,
    }));
  }
}

// ── Listener messaggi dal popup ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INJECT_PROMPT') {
    const success = injectText(message.text);
    sendResponse({ success, host: window.location.hostname });
    return true; // Keep channel open per risposta asincrona
  }

  if (message.type === 'PING') {
    sendResponse({ alive: true, host: window.location.hostname });
    return true;
  }
});

// Segnala al background che il content script è pronto
chrome.runtime.sendMessage({
  type: 'CONTENT_READY',
  host: window.location.hostname,
}).catch(() => {
  // Ignora errori se il background non è attivo
});
