export function downloadText(filename, value, type) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Give the browser time to begin the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(filename, value) {
  downloadText(filename, `${JSON.stringify(value, null, 2)}\n`, 'application/json');
}
