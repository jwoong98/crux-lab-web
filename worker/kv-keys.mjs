// Workers KV keys of the climbing guide (PLAN 묶음 E, DEC-038 4), the one place for them: the public Worker reads them and
// the CMS Worker writes them. {pathname} is the public address path without the query, pages with the trailing slash.

/** A page body (text/html): page:/climbing/slab/, the hub page:/climbing/. */
export const pageKey = (pathname) => `page:${pathname}`;

/** A site file body: file:/sitemap.xml, file:/robots.txt. */
export const fileKey = (pathname) => `file:${pathname}`;

/** Image bytes with metadata { contentType }: img:/climbing/images/new-term-meaning.webp. */
export const imageKey = (pathname) => `img:${pathname}`;

/** Hidden or unpublished page marker (value '1'): gone:/climbing/slab/ answers 404 (DEC-020). */
export const goneKey = (pathname) => `gone:${pathname}`;
