// Only restore a query string on this site's root, never an arbitrary return URL.
const returnQuery = new URLSearchParams(window.location.search).get('return');
if (returnQuery?.startsWith('?')) {
  const destination = new URL('/', window.location.origin);
  destination.search = returnQuery;
  document.querySelectorAll('a[href="/"]').forEach(link => { link.href = destination.href; });
}
