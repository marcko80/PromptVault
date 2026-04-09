// PromptVault — Service Worker
// Carica 2 prompt di esempio neutri al primo avvio

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({ prompts: getSamplePrompts() });
  }
});

function getSamplePrompts() {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: 'Esempio — Riepilogo strutturato',
      content: 'Riepiloga il seguente testo in modo strutturato:\n\n[INCOLLA IL TESTO]\n\nFormato richiesto:\n- Punto principale\n- Punti secondari (max 5)\n- Conclusione in una frase',
      description: 'Prompt di esempio — modificalo o eliminalo liberamente',
      tags: ['esempio', 'riepilogo'],
      model: 'all',
      category: 'Esempi',
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
    {
      id: crypto.randomUUID(),
      title: 'Esempio — Revisione testo',
      content: 'Revisiona il seguente testo: correggi gli errori grammaticali e migliora la chiarezza senza cambiare il significato originale. Mantieni il tono [formale / informale].\n\n[INCOLLA IL TESTO]',
      description: 'Prompt di esempio — modificalo o eliminalo liberamente',
      tags: ['esempio', 'scrittura', 'revisione'],
      model: 'all',
      category: 'Esempi',
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    },
  ];
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CONTENT_READY') {
    console.log('PromptVault: content script attivo su', message.host);
  }
});
