import MarkdownIt from 'markdown-it'
import { Liquid } from 'liquidjs'

// Private Use Area characters: never produced by markdown-it, never meaningful in Markdown
const OPEN = '\uE000';
const CLOSE = '\uE001';

export class TemplateRenderer {
    private readonly encoder = new TextEncoder();
    private readonly decoder = new TextDecoder();
    private readonly liquid: Liquid;
    private readonly md = new MarkdownIt({ html: false });

    constructor() {
        this.liquid = new Liquid({
            strictVariables: true,
            // outputEscape() is called for every {{ ... }} output, after filters
            outputEscape: (value: unknown) => `${OPEN}${this.toHex(String(value ?? ''))}${CLOSE}`,
        });
    }

    async render(template: string, data: unknown): Promise<string> {
        // strip sentinels from the template itself, so only Liquid outputs can create tokens
        const safeTemplate = template.replace(/[\uE000\uE001]/g, '');

        const markdown = await this.liquid.parseAndRender(safeTemplate, data as object);
        const html = this.md.render(markdown);

        const updatedHtml = html.replace(
            /\uE000([0-9a-f]*)\uE001/g,
            (_, hex: string) => {
                const content = TemplateRenderer.escapeHtml(this.fromHex(hex));
                const span = `<span class="injected">${content}</span>`;
                return span;
            }
        );
        return updatedHtml;
    }

    private toHex(s: string) {
        return Array.from(this.encoder.encode(s), (b) => b.toString(16).padStart(2, '0')).join('');
    }

    private fromHex(hex: string) {
        return this.decoder.decode(Uint8Array.from(hex.match(/../g) ?? [], (x) => parseInt(x, 16)));
    }

    private static escapeHtml(s: string) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
