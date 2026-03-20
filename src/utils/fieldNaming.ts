export function toKernelFieldName(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/[\s_]+/g, '_')
    .replace(/^_|_$/g, '');
  return `kernel_${slug}`;
}
