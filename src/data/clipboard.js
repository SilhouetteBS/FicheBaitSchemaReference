export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the document-based copy path.
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.append(textArea);
  textArea.select();
  const copied = document.execCommand('copy');
  textArea.remove();
  if (!copied) {
    throw new Error('The browser did not allow clipboard access.');
  }
}
