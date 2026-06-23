/* eslint-disable @typescript-eslint/no-explicit-any */
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { Book } from '../../types';

export class EpubParser {
    private zip: JSZip | null = null;
    private xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
    });

    async parse(input: File | Blob | ArrayBuffer): Promise<Book> {
        let zip: JSZip;

        if (input instanceof ArrayBuffer) {
            // ArrayBuffer from URL fetch
            const bytes = new Uint8Array(input);
            if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
                throw new Error('Invalid file format');
            }
            zip = await JSZip.loadAsync(input);
        } else if (input instanceof Blob) {
            // File or Blob
            const headerBlob = input.slice(0, 4);
            const buffer = await this.blobToArrayBuffer(headerBlob);
            const bytes = new Uint8Array(buffer);

            if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
                throw new Error('Invalid file format');
            }
            zip = await JSZip.loadAsync(input);
        } else {
            throw new Error('Invalid input: Expected a File, Blob, or ArrayBuffer');
        }

        this.zip = zip;

        // 1. Find OPF file path from container.xml
        const containerXml = await zip.file('META-INF/container.xml')?.async('text');
        if (!containerXml) {
            throw new Error('Invalid EPUB: Missing META-INF/container.xml');
        }

        const containerData = this.xmlParser.parse(containerXml);
        // Path: container -> rootfiles -> rootfile -> @full-path
        let rootFile = containerData.container?.rootfiles?.rootfile;
        if (Array.isArray(rootFile)) {
            rootFile = rootFile[0];
        }
        const opfPath = rootFile?.['@_full-path'];

        if (!opfPath) {
            throw new Error('Invalid EPUB: No rootfile found in container.xml');
        }

        // 2. Parse OPF
        const opfContent = await zip.file(opfPath)?.async('text');
        if (!opfContent) {
            throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
        }

        const opfData = this.xmlParser.parse(opfContent);
        const metadata = opfData.package?.metadata;

        // Handle namespaced tags like dc:title, dc:creator
        const title = this.extractText(metadata?.['dc:title']);
        const author = this.extractText(metadata?.['dc:creator']);
        const publisher = this.extractText(metadata?.['dc:publisher']);
        const pubDate = this.extractText(metadata?.['dc:date']);
        const subject = this.extractText(metadata?.['dc:subject']);

        // Extract Cover ID
        let coverId = '';
        const meta = metadata?.meta;
        if (meta) {
            const metaList = Array.isArray(meta) ? meta : [meta];
            const coverMeta = metaList.find((m: any) => m['@_name'] === 'cover');
            if (coverMeta) {
                coverId = coverMeta['@_content'];
            }
        }

        // 3. Parse Manifest
        const manifestItems = opfData.package?.manifest?.item;
        const manifest: Record<string, string> = {};

        const items = manifestItems ? (Array.isArray(manifestItems) ? manifestItems : [manifestItems]) : [];
        items.forEach((item: unknown) => {
            if (item && typeof item === 'object') {
                const id = (item as any)['@_id'];
                const href = (item as any)['@_href'];
                if (id && href) {
                    manifest[id] = href;
                }
            }
        });

        // Resolve Cover URL & Blob
        let coverUrl: string | undefined;
        let coverBlob: Blob | undefined;

        const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/'));
        const basePath = opfDir ? opfDir + '/' : '';

        if (coverId && manifest[coverId]) {
            const coverHref = manifest[coverId];
            const fullPath = this.resolvePath(basePath, coverHref);

            const coverFile = zip.file(fullPath);
            if (coverFile) {
                const blob = await coverFile.async('blob');
                const mime = this.getMimeType(fullPath);
                coverBlob = new Blob([blob], { type: mime || 'image/jpeg' });
                // Create Blob URL
                coverUrl = URL.createObjectURL(coverBlob);
            }
        }

        // Fallback Logic
        if (!coverUrl) {
            const allItems = manifestItems ? (Array.isArray(manifestItems) ? manifestItems : [manifestItems]) : [];
            const coverItem = allItems.find((item: unknown) => {
                if (!item || typeof item !== 'object') return false;
                const props = (item as any)['@_properties'] || '';
                const id = (item as any)['@_id'] || '';
                return props.includes('cover-image') || id === 'cover';
            });

            if (coverItem) {
                const href = (coverItem as any)['@_href'];
                if (href) {
                    const fullPath = this.resolvePath(basePath, href);
                    const coverFile = zip.file(fullPath);

                    if (coverFile) {
                        const blob = await coverFile.async('blob');
                        const mime = this.getMimeType(fullPath);
                        coverBlob = new Blob([blob], { type: mime || 'image/jpeg' });
                        coverUrl = URL.createObjectURL(coverBlob);
                    }
                }
            }
        }

        // 4. Parse Spine
        const spineItems = opfData.package?.spine?.itemref;
        const spine: string[] = [];
        const itemRefs = spineItems ? (Array.isArray(spineItems) ? spineItems : [spineItems]) : [];

        itemRefs.forEach((ref: unknown) => {
            const idref = (ref as any)['@_idref'];
            if (idref && manifest[idref]) {
                const href = manifest[idref];
                spine.push(basePath + href);
            }
        });

        // 5. Parse TOC
        const toc = await this.parseToc(zip, opfData, opfPath, manifest, basePath);

        // 6. Construct Book object
        return {
            id: 'generated-id',
            metadata: {
                title: title || 'Unknown Title',
                author: author || 'Unknown Author',
                publisher,
                pubDate,
                subject,
                coverUrl,
                coverBlob
            },
            spine,
            toc
        };
    }

    async getChapter(path: string): Promise<string> {
        if (!this.zip) {
            throw new Error('Parser not initialized. Call parse() first.');
        }

        const file = this.zip.file(path);
        if (!file) {
            throw new Error(`Chapter not found: ${path}`);
        }

        const html = await file.async('string');

        // Resolve images
        // Base dir of the chapter
        const chapterDir = path.substring(0, path.lastIndexOf('/'));
        const base = chapterDir ? chapterDir + '/' : '';

        // Match src="...", href="...", xlink:href="..."
        const attrRegex = /(src|href|xlink:href)\s*=\s*(["'])(.+?)\2/g;
        const matches = Array.from(html.matchAll(attrRegex));
        const replacements = new Map<string, string>();

        for (const match of matches) {
            const fullMatch = match[0];
            const attrName = match[1];
            const src = match[3];

            if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('#') || src.startsWith('mailto:')) continue;

            const fullPath = this.resolvePath(base, src);
            const imgFile = this.zip.file(fullPath);

            if (imgFile) {
                const mime = this.getMimeType(fullPath);
                // Only replace if it is an image
                if (mime.startsWith('image/')) {
                    const blob = await imgFile.async('blob');
                    const typedBlob = mime ? new Blob([blob], { type: mime }) : blob;
                    const url = URL.createObjectURL(typedBlob);
                    replacements.set(fullMatch, `${attrName}="${url}"`);
                }
            }
        }

        let newHtml = html;
        for (const [key, value] of replacements) {
            newHtml = newHtml.split(key).join(value);
        }

        return newHtml;
    }

    private resolvePath(base: string, relative: string): string {
        const stack = base.split('/').filter(p => p !== '');
        const parts = relative.split('/');

        for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
                stack.pop();
            } else {
                stack.push(part);
            }
        }
        if (stack.length === 0) return relative;
        return stack.join('/');
    }

    private getMimeType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'svg': return 'image/svg+xml';
            case 'webp': return 'image/webp';
            default: return '';
        }
    }

    private extractText(field: unknown): string {
        if (!field) return '';
        if (typeof field === 'string') return field;
        if (typeof field === 'object' && field !== null && '#text' in field && (field as any)['#text']) return (field as any)['#text'];
        if (Array.isArray(field)) return this.extractText(field[0]);
        return '';
    }

    private blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
        if (typeof blob.arrayBuffer === 'function') {
            return blob.arrayBuffer();
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    private async parseToc(
        zip: JSZip,
        opfData: any,
        _opfPath: string,
        manifest: Record<string, string>,
        basePath: string
    ): Promise<import('../../types').TOCItem[]> {
        const items = opfData.package?.manifest?.item;
        const itemList = items ? (Array.isArray(items) ? items : [items]) : [];

        // Try EPUB 3: Look for nav document with properties="nav"
        const navItem = itemList.find((item: any) => {
            const props = item['@_properties'] || '';
            return props.includes('nav');
        });

        if (navItem) {
            const navHref = navItem['@_href'];
            const navPath = this.resolvePath(basePath, navHref);
            const navFile = zip.file(navPath);
            if (navFile) {
                const navContent = await navFile.async('text');
                const navDir = navPath.substring(0, navPath.lastIndexOf('/'));
                const navBase = navDir ? navDir + '/' : '';
                return this.parseNavHtml(navContent, navBase);
            }
        }

        // Try EPUB 2: Look for NCX file from spine@toc or manifest
        const spineToc = opfData.package?.spine?.['@_toc'];
        let ncxHref = spineToc ? manifest[spineToc] : null;

        if (!ncxHref) {
            // Fallback: find item with media-type="application/x-dtbncx+xml"
            const ncxItem = itemList.find((item: any) =>
                item['@_media-type'] === 'application/x-dtbncx+xml'
            );
            if (ncxItem) {
                ncxHref = ncxItem['@_href'];
            }
        }

        if (ncxHref) {
            const ncxPath = this.resolvePath(basePath, ncxHref);
            const ncxFile = zip.file(ncxPath);
            if (ncxFile) {
                const ncxContent = await ncxFile.async('text');
                const ncxDir = ncxPath.substring(0, ncxPath.lastIndexOf('/'));
                const ncxBase = ncxDir ? ncxDir + '/' : '';
                return this.parseNcx(ncxContent, ncxBase);
            }
        }

        return [];
    }

    private parseNcx(ncxContent: string, basePath: string): import('../../types').TOCItem[] {
        const ncxData = this.xmlParser.parse(ncxContent);
        const navMap = ncxData.ncx?.navMap;
        if (!navMap) return [];

        const parseNavPoints = (navPoints: any): import('../../types').TOCItem[] => {
            if (!navPoints) return [];
            const points = Array.isArray(navPoints) ? navPoints : [navPoints];

            return points.map((point: any, index: number) => {
                const label = this.extractText(point.navLabel?.text) || `Chapter ${index + 1}`;
                const contentSrc = point.content?.['@_src'] || '';
                const href = contentSrc.split('#')[0]; // Remove fragment
                const resolvedHref = this.resolvePath(basePath, href);

                return {
                    id: point['@_id'] || `toc-${index}`,
                    label,
                    href: resolvedHref,
                    children: parseNavPoints(point.navPoint)
                };
            });
        };

        return parseNavPoints(navMap.navPoint);
    }

    private parseNavHtml(navContent: string, basePath: string): import('../../types').TOCItem[] {
        // Parse nav.xhtml - it's HTML with <nav epub:type="toc">
        // We'll use a simple regex approach since we can't use DOM parser in Node
        // Find the toc nav section - use GREEDY match to get full content
        const tocMatch = navContent.match(/<nav[^>]*epub:type="toc"[^>]*>([\s\S]*)<\/nav>/i);
        if (!tocMatch) {
            // Try without namespace
            const altMatch = navContent.match(/<nav[^>]*type="toc"[^>]*>([\s\S]*)<\/nav>/i);
            if (!altMatch) return [];
            return this.parseNavOl(altMatch[1], basePath, 0);
        }

        return this.parseNavOl(tocMatch[1], basePath, 0);
    }

    private parseNavOl(html: string, basePath: string, depth: number): import('../../types').TOCItem[] {
        const items: import('../../types').TOCItem[] = [];

        // Use a more robust approach to extract li elements
        // We need to handle nested structures properly
        let index = 0;
        let pos = 0;

        while (pos < html.length) {
            // Find next <li>
            const liStart = html.indexOf('<li', pos);
            if (liStart === -1) break;

            // Find the matching </li> by counting nesting
            let liEnd = -1;
            let nestLevel = 0;
            let searchPos = liStart;

            while (searchPos < html.length) {
                const nextOpen = html.indexOf('<li', searchPos + 1);
                const nextClose = html.indexOf('</li>', searchPos);

                if (nextClose === -1) break;

                if (nextOpen !== -1 && nextOpen < nextClose) {
                    nestLevel++;
                    searchPos = nextOpen + 3;
                } else {
                    if (nestLevel === 0) {
                        liEnd = nextClose + 5;
                        break;
                    }
                    nestLevel--;
                    searchPos = nextClose + 5;
                }
            }

            if (liEnd === -1) break;

            const liContent = html.substring(liStart, liEnd);
            pos = liEnd;

            // Try to extract <a> tag first
            const aMatch = liContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);

            // Also try to extract <span> tag (for section headers without links)
            const spanMatch = liContent.match(/<span[^>]*>([\s\S]*?)<\/span>/i);

            // Check for nested <ol>
            const nestedOlMatch = liContent.match(/<ol[^>]*>([\s\S]*)<\/ol>/i);
            let children: import('../../types').TOCItem[] | undefined;

            if (nestedOlMatch) {
                children = this.parseNavOl(nestedOlMatch[1], basePath, depth + 1);
                if (children.length === 0) children = undefined;
            }

            // Determine which comes first: span or a
            // If span comes first AND has children, it's a section header
            const spanIndex = spanMatch ? liContent.indexOf(spanMatch[0]) : -1;
            const aIndex = aMatch ? liContent.indexOf(aMatch[0]) : -1;

            const useSpanAsHeader = spanMatch &&
                children &&
                children.length > 0 &&
                spanIndex !== -1 &&
                (aIndex === -1 || spanIndex < aIndex);

            if (useSpanAsHeader) {
                // Section header with <span> - use span text as label, use first child's href
                const label = spanMatch[1].replace(/<[^>]+>/g, '').trim();
                const firstChildHref = children![0]?.href || '';

                items.push({
                    id: `nav-${depth}-${index}`,
                    label: label || `Section ${index + 1}`,
                    href: firstChildHref,
                    children
                });
                index++;
            } else if (aMatch) {
                // Has a link - use href and label from <a>
                const href = aMatch[1].split('#')[0];
                const labelHtml = aMatch[2];
                const label = labelHtml.replace(/<[^>]+>/g, '').trim() || `Item ${index + 1}`;
                const resolvedHref = this.resolvePath(basePath, href);

                items.push({
                    id: `nav-${depth}-${index}`,
                    label,
                    href: resolvedHref,
                    children
                });
                index++;
            }
        }

        return items;
    }
}

