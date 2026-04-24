export function nookDataUrl(relPath: string): string {
  const clean = relPath.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `nook-data://local/${clean}`;
}
