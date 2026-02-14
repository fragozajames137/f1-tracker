export function driverSrc(slug: string, size: 48 | 96 | 192): string {
  return `/drivers/optimized/${slug}-${size}.webp`;
}

export function logoSrc(slug: string, size: 24 | 48 | 96): string {
  return `/logos/optimized/${slug}-${size}.webp`;
}

export function extractSlug(url: string | undefined, prefix: string): string | null {
  if (!url) return null;
  const re = new RegExp(`/${prefix}/(.+?)\\.\\w+$`);
  const match = url.match(re);
  return match ? match[1] : null;
}
