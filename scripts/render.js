import MarkdownIt from 'markdown-it';
import { Liquid } from 'liquidjs';
// Private Use Area characters: never produced by markdown-it, never meaningful in Markdown
const OPEN = '\uE000';
const CLOSE = '\uE001';
export class TemplateRenderer {
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    liquid;
    md = new MarkdownIt({ html: false });
    constructor() {
        this.liquid = new Liquid({
            strictVariables: true,
            // outputEscape() is called for every {{ ... }} output, after filters
            outputEscape: (value) => `${OPEN}${this.toHex(String(value ?? ''))}${CLOSE}`,
        });
    }
    async render(template, data) {
        // strip sentinels from the template itself, so only Liquid outputs can create tokens
        const safeTemplate = template.replace(/[\uE000\uE001]/g, '');
        const markdown = await this.liquid.parseAndRender(safeTemplate, data);
        const html = this.md.render(markdown);
        return html.replace(/\uE000([0-9a-f]*)\uE001/g, (_, hex) => `<span class="injected">${TemplateRenderer.escapeHtml(this.fromHex(hex))}</span><sup> [1] [2]</sup>`);
    }
    toHex(s) {
        return Array.from(this.encoder.encode(s), b => b.toString(16).padStart(2, '0')).join('');
    }
    fromHex(hex) {
        return this.decoder.decode(Uint8Array.from(hex.match(/../g) ?? [], x => parseInt(x, 16)));
    }
    static escapeHtml(s) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
const template = "# File-Sign Delivery Receipt\n\n{% assign sa = sending.sender.sendingApproval.__signature__ %}{% assign ra = reception.recipient.receptionApproval.__signature__ %}{% assign cert = fileSignCert.x509Chain[0] %}\nMessage #**{{ sa.payload.messageId }}** sent by **{{ sa.payload.senderEmail }}** [1][2] to **{{ sa.payload.recipientEmail }}** [2]{% if ra %}[3][4]{% endif %}.\n\n- Sending approved on **{{ sa.context.signedAt | divided_by: 1000 | date: '%B %d, %Y at %H:%M:%S' }}** [2]\n{% if ra %}- Reception approved on **{{ ra.context.signedAt | divided_by: 1000 | date: '%B %d, %Y at %H:%M:%S' }}** [4]\n{% else %}- Reception: not yet approved\n{% endif %}{% if cert %}- Sending service: **{{ cert.subject['2.5.4.3'].values[0] }}** [5]\n{% endif %}\n## Message\n\n| | |\n|---|---|\n| Title | **{{ sa.payload.title }}** [2] |\n| Body | {{ sending.body }} |\n\n## Attached files ({{ sa.payload.files | size }})\n\n| Name | Size | SHA-256 |\n|---|---|---|\n{% for f in sa.payload.files %}| **{{ f.filename }}** [2]{% if ra %}[4]{% endif %} | {{ f.size | divided_by: 1024.0 | round: 1 }} KB | `{{ f.sha256 }}` [2]{% if ra %}[4]{% endif %} |\n{% endfor %}\n{% if ra %}## Blockchain anchoring\n\n`{{ ra.payload.virtualBlockchainId }}` [4]\n\n{% endif %}---\n\n## Proofs\n\n**[1] Sender email**: SD-JWT verifiable presentation (EmailCredential), with proof of possession.\n\n**[2] Sending approval**: \"{{ sa.context.purpose }}\". {{ sa.signatureType }} signature, key `{{ sa.publicKey | truncate: 50 }}`. It covers the title, sender, recipient and files.\n\n{% if ra %}**[3] Recipient email**: SD-JWT verifiable presentation (EmailCredential), with proof of possession.\n\n**[4] Reception approval**: \"{{ ra.context.purpose }}\". {{ ra.signatureType }} signature, key `{{ ra.publicKey | truncate: 50 }}`. It covers the virtual blockchain identifier, sender, recipient and files.\n\n{% endif %}{% if cert %}**[5] Service certificate**: subject {{ cert.subject['2.5.4.3'].values[0] }}, issuer {{ cert.issuer['2.5.4.3'].values[0] }}{% if cert.info.selfSigned %} (self-signed){% endif %}. Serial number `{{ cert.info.serialNumber }}`. Valid from {{ cert.info.notBefore | date: '%B %d, %Y' }} to {{ cert.info.notAfter | date: '%B %d, %Y' }}.\n{% endif %}";
const data = {
    "sending": {
        "title": "Demo",
        "body": "test",
        "recipientEmail": "gael.marcadet@carmentis.io",
        "files": [
            {
                "filename": "1792488694704-129258100",
                "mimetype": "text/markdown",
                "size": 88,
                "sha256": "e13d8cc5233bb584727bb1e6f568396a312eb89ee132af849c5bc1b28adb201a"
            }
        ],
        "sender": {
            "email": {
                "__vp__": {
                    "__sdjwt_ietf__": "eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKRlpESTFOVEU1SWl3aWVDSTZJa3R6Y0RKNlVHdElYM3BhT0ZjdE1ETkxNeTFaUTJaR1prSldSRzlsTTBnNE5GTTBiV1pyY0RSMlpsRWlMQ0pyZEhraU9pSlBTMUFpTENKNE5XTWlPbHNpVFVsSlFteEVRME5CVldGblFYZEpRa0ZuU1ZWSlRXaFVkVE5rZFM5QlpWcE5NM0J6WmtSRVdYZHNMMmcwU0VWM1FsRlpSRXN5Vm5kTlIyOTRSV3BCVVVKblRsWkNRVTFOUTFWT2FHTnRNV3hpYmxKd1kzcEZVMDFDUVVkQk1WVkZRM2QzU2xFeVJubGlWMVoxWkVkc2VrMVJjM2REVVZsRVZsRlJSMFYzU2tkVmFrVlFUVUV3UjBFeFZVVkRRWGRIVW01S2FHSnRUbXhOVVRSM1JFRlpSRlpSVVVoRVFWWlJXVmhLY0dONlJWTk5Ra0ZIUVRGVlJVTm5kMHBSTWtaNVlsZFdkV1JIYkhwTlFqUllSRlJKTWsxRVdYcE5SRUUxVFZSSk1VMXNiMWhFVkVrelRVUlplazFFUVRWTlZFa3hUV3h2ZDJGcVJWTk5Ra0ZIUVRGVlJVRjNkMHBSTWtaNVlsZFdkV1JIYkhwTlVrbDNSVUZaUkZaUlVVeEVRV3hFV1ZoS2RGcFhOVEJoV0UxNFEzcEJTa0puVGxaQ1FWbFVRV3RhVTAxUk9IZEVVVmxFVmxGUlNVUkJXa2RqYlVaMVdUSlZlRVJxUVUxQ1owNVdRa0ZqVFVKV1FtaGpiV3g2VFZKSmQwVkJXVVJXVVZGTFJFRnNSRmxZU25SYVZ6VXdZVmhOZDB0cVFVWkNaMDF5V2xoQlJFbFJRWEY1Ym1KTksxRm1MMDV1ZUdJM1ZHTnlaalZuU2poV09FWlZUMmczWTJaNmFFeHBXaXRUYm1rNU9VUkJSa0puVFhKYVdFRkVVVkZFVUV0VGRrVm9aelp2WTFwa1dqbFlZa2xuWjBOclJrdDRWVlV4ZVdKWmFGVnNaVVkxYTA1R05FTjBUVFI1Tm1oSFJqTXJRM0pHVnpWdldrUnRaM0V5TTBWME0zUnJWSGh1U1haU1NWcHhlVVJUTUdSSlFTSmRmUSIsImlhdCI6MTc5MjQxNDcxOCwidmN0IjoiRW1haWxDcmVkZW50aWFsIiwic3ViIjoiZGlkOmp3azpleUpoYkdjaU9pSlNVekkxTmlJc0ltVWlPaUpCVVVGQ0lpd2lhM1I1SWpvaVVsTkJJaXdpYmlJNklqWlpkREJvT1ZneFNHeEpWMDFxVVVSeWNWaDJaMVJOZGxkdWNVOXNSRTUxYmpZeFh6TlhVR1F5WVdjM2EyRkRZVFpyY0Y5dWRUbDJURmwyU0RkVk4zTnBNRE42YVU5U1JHWmFVMVJ2ZGxob1JtVjRTRUZaZVdsU1EwaEhWVXRmVVhwd05EVTBRV1JFTmxZMlRUSnhla0Z5TFY5SWJrSmxjbGhIWVc1d1lraHhNMDQxY0RCTlgxQjVSa2xFVmpWbVIzcG1VMlJmUkY5QlpGZFFNMmRQYzFRdE9FWnpSVkZHYWpKR1RGSlljMlExUVRGQ1kwOU9jbFpZUlhWM1pEaGZTM1JTZUVOU1JUTkVPVk5WYjBSYVUwOUtWVjlrUkZaRWREZEVOWFJNYmt0emJscENPVVJaVUhKT1ZtMXFORXB3V2pFd1ZUaENTMUZZY0d4V05tSXRPVU5MTTFsS09EaElkVUl4VVVKS1JrOXRialJYTm5nNWRGaExSMWxuTVZGSllrOHpNa0oxUnpKWGIzbEtSM0pGYWtsRmFFcEJMVnBuVjFNM2IzQnZhVzFpT0dReWFHMUdSRTkyYm1oU1JrZFpkR1I2T0ZjeWR5SjkiLCJqdGkiOiIzZjJkZGRhMS1mNzVmLTRiMTktOThiMS02MWMwMjcyMDczMDIiLCJzdGF0dXMiOnsic3RhdHVzX2xpc3QiOnsiaWR4IjoyNSwidXJpIjoiaHR0cHM6Ly9pc3N1ZXIuYWRtaW4uY2FybWVudGlzLmlvL2FwaS9kZW1vLXZjLWVtYWlsL2NyZWRlbnRpYWwvc3RhdHVzIn19LCJfc2QiOlsiM0lQUnFNVVN2WGlEYXNaNXFFNGJVSHJBUkh5UjhpY3Qyd2lPQ2NQZnRxMCIsImZxVDBMZ1A3dVhsUnk3T2VYRmtNX3JOcmwtaU1BRzBuSjV2V2hYN1g3dnMiLCJoMXZfSWpPOUtZUW93N1l6QTM0YXZaRHI3V0w2ekxDNHFhVktHcThPX0ZvIiwidFJkdVdZTC1HMlkwck5CREtqVDdITndCQkxUdkg5S2Y4T1dZZGUtNXhFVSJdLCJfc2RfYWxnIjoic2hhLTI1NiJ9.-u4I6lGE8PkLKLQ_gGtFRf9pmPn9_A3XHZIwo-9ggJFpKuo7pGOkPGE_-h2-IFpl8LLaYBB1TgGszz4rc67KBQ~WyJYN25IZ01KUEdVY1laSmR0N2dfd3hnIiwiZW1haWwiLCJnYWVsLm1hcmNhZGV0QGNhcm1lbnRpcy5pbyJd~eyJ0eXAiOiJrYitqd3QiLCJhbGciOiJSUzI1NiJ9.eyJub25jZSI6ImlDdllUTEpBbTNOMUNkd24xdmxsREp5M2xJL1BQejlHTy9lUFdjajUxYjA9IiwiaWF0IjoxNzkyNDE1MzkxLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjUxNzMiLCJzZF9oYXNoIjoiRURBZDBjeXU2WnRWdWNxN00wcTl0Zkc0WHB6UDdfcDFSWFgxM2dWRENxdyJ9.cxFYcYdKQuxZCzK-PnZdu1iZhxGWSYiTIfXmBnkRLO-i_8oHCBJufE-BqnXE-zV7W5T7kySzQ4PKyihXzPAaKDncNi_V1qOHaXqerei1qIH5uj7ORb5oz88LeA_EjTb0hQGAC5MTlSe95K9PgFeRDvjGbJ1dqi_Ovc9fxbbLJ33lSaLmd30L6cFbmnLrJe3z4zyjIC4bonHKMct84vB2pPldVmamWgUBDTCe7L6YOjw4sVni8Jok2sYe6YAlQYn83-FnEOc0BRRnyT02ym52KOsrIRGIwU0Lw-L5WJgsQxPT2oa1QJQfLR1ceYuf-fr2RPUKF-RK1qQT4ZC-4gnhCg"
                }
            },
            "sendingApproval": {
                "__signature__": {
                    "signatureType": "json-canonical+utf8",
                    "context": {
                        "signedAt": 1792488716832,
                        "purpose": "FileSign: approve the sending of a message"
                    },
                    "signature": "qwkcm831eAnxzyy+Y+Ex/utZ3KAIJyjKQuTbj0BtR8yDMNC36e0y5K4jjN7c4RYTKzYnFnAAbC9WFv39BoKcKlDgkxwzand0zj8jPPZ8AuJkB8qtLXC7NmaUtG1KJtr/jko8yEoJJgNqbkt9P016pFmQc+Netd43Dtdl0DiiULs4Q2i1EJ/j2vfNZrFdd7QaHNS75jYduENXaOaSRTN/xMSMNHsJQK2D6Nkh0m6rsPKQnrF4ezjkM8gJCZSyM4ZjeOkj3QCpFG6EHlkkxS4cJ+CDFcfj7t6sGJLH9G/KQrFZIn1VMls0/yHQPJEP2cjh1v72haqyCLT4Jv8M+2eiag==",
                    "payload": {
                        "type": "fileSign/sendingApproval",
                        "messageId": 6,
                        "nonce": "e5da67b92874a238034fd7a2bde46ea7",
                        "title": "Demo",
                        "senderEmail": "gael.marcadet@carmentis.io",
                        "recipientEmail": "gael.marcadet@carmentis.io",
                        "files": [
                            {
                                "filename": "1792488694704-129258100",
                                "sha256": "e13d8cc5233bb584727bb1e6f568396a312eb89ee132af849c5bc1b28adb201a",
                                "size": 88
                            }
                        ]
                    },
                    "publicKey": "did:jwk:eyJhbGciOiJSUzI1NiIsImUiOiJBUUFCIiwia3R5IjoiUlNBIiwibiI6IjZZdDBoOVgxSGxJV01qUURycVh2Z1RNdlducU9sRE51bjYxXzNXUGQyYWc3a2FDYTZrcF9udTl2TFl2SDdVN3NpMDN6aU9SRGZaU1RvdlhoRmV4SEFZeWlSQ0hHVUtfUXpwNDU0QWRENlY2TTJxekFyLV9IbkJlclhHYW5wYkhxM041cDBNX1B5RklEVjVmR3pmU2RfRF9BZFdQM2dPc1QtOEZzRVFGajJGTFJYc2Q1QTFCY09OclZYRXV3ZDhfS3RSeENSRTNEOVNVb0RaU09KVV9kRFZEdDdENXRMbktzblpCOURZUHJOVm1qNEpwWjEwVThCS1FYcGxWNmItOUNLM1lKODhIdUIxUUJKRk9tbjRXNng5dFhLR1lnMVFJYk8zMkJ1RzJXb3lKR3JFaklFaEpBLVpnV1M3b3BvaW1iOGQyaG1GRE92bmhSRkdZdGR6OFcydyJ9",
                    "signatureEncoding": "base64"
                }
            }
        }
    },
    "reception": {
        "recipient": {
            "email": {
                "__vp__": {
                    "__sdjwt_ietf__": "eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKRlpESTFOVEU1SWl3aWVDSTZJa3R6Y0RKNlVHdElYM3BhT0ZjdE1ETkxNeTFaUTJaR1prSldSRzlsTTBnNE5GTTBiV1pyY0RSMlpsRWlMQ0pyZEhraU9pSlBTMUFpTENKNE5XTWlPbHNpVFVsSlFteEVRME5CVldGblFYZEpRa0ZuU1ZWSlRXaFVkVE5rZFM5QlpWcE5NM0J6WmtSRVdYZHNMMmcwU0VWM1FsRlpSRXN5Vm5kTlIyOTRSV3BCVVVKblRsWkNRVTFOUTFWT2FHTnRNV3hpYmxKd1kzcEZVMDFDUVVkQk1WVkZRM2QzU2xFeVJubGlWMVoxWkVkc2VrMVJjM2REVVZsRVZsRlJSMFYzU2tkVmFrVlFUVUV3UjBFeFZVVkRRWGRIVW01S2FHSnRUbXhOVVRSM1JFRlpSRlpSVVVoRVFWWlJXVmhLY0dONlJWTk5Ra0ZIUVRGVlJVTm5kMHBSTWtaNVlsZFdkV1JIYkhwTlFqUllSRlJKTWsxRVdYcE5SRUUxVFZSSk1VMXNiMWhFVkVrelRVUlplazFFUVRWTlZFa3hUV3h2ZDJGcVJWTk5Ra0ZIUVRGVlJVRjNkMHBSTWtaNVlsZFdkV1JIYkhwTlVrbDNSVUZaUkZaUlVVeEVRV3hFV1ZoS2RGcFhOVEJoV0UxNFEzcEJTa0puVGxaQ1FWbFVRV3RhVTAxUk9IZEVVVmxFVmxGUlNVUkJXa2RqYlVaMVdUSlZlRVJxUVUxQ1owNVdRa0ZqVFVKV1FtaGpiV3g2VFZKSmQwVkJXVVJXVVZGTFJFRnNSRmxZU25SYVZ6VXdZVmhOZDB0cVFVWkNaMDF5V2xoQlJFbFJRWEY1Ym1KTksxRm1MMDV1ZUdJM1ZHTnlaalZuU2poV09FWlZUMmczWTJaNmFFeHBXaXRUYm1rNU9VUkJSa0puVFhKYVdFRkVVVkZFVUV0VGRrVm9aelp2WTFwa1dqbFlZa2xuWjBOclJrdDRWVlV4ZVdKWmFGVnNaVVkxYTA1R05FTjBUVFI1Tm1oSFJqTXJRM0pHVnpWdldrUnRaM0V5TTBWME0zUnJWSGh1U1haU1NWcHhlVVJUTUdSSlFTSmRmUSIsImlhdCI6MTc5MjQxNDcxOCwidmN0IjoiRW1haWxDcmVkZW50aWFsIiwic3ViIjoiZGlkOmp3azpleUpoYkdjaU9pSlNVekkxTmlJc0ltVWlPaUpCVVVGQ0lpd2lhM1I1SWpvaVVsTkJJaXdpYmlJNklqWlpkREJvT1ZneFNHeEpWMDFxVVVSeWNWaDJaMVJOZGxkdWNVOXNSRTUxYmpZeFh6TlhVR1F5WVdjM2EyRkRZVFpyY0Y5dWRUbDJURmwyU0RkVk4zTnBNRE42YVU5U1JHWmFVMVJ2ZGxob1JtVjRTRUZaZVdsU1EwaEhWVXRmVVhwd05EVTBRV1JFTmxZMlRUSnhla0Z5TFY5SWJrSmxjbGhIWVc1d1lraHhNMDQxY0RCTlgxQjVSa2xFVmpWbVIzcG1VMlJmUkY5QlpGZFFNMmRQYzFRdE9FWnpSVkZHYWpKR1RGSlljMlExUVRGQ1kwOU9jbFpZUlhWM1pEaGZTM1JTZUVOU1JUTkVPVk5WYjBSYVUwOUtWVjlrUkZaRWREZEVOWFJNYmt0emJscENPVVJaVUhKT1ZtMXFORXB3V2pFd1ZUaENTMUZZY0d4V05tSXRPVU5MTTFsS09EaElkVUl4VVVKS1JrOXRialJYTm5nNWRGaExSMWxuTVZGSllrOHpNa0oxUnpKWGIzbEtSM0pGYWtsRmFFcEJMVnBuVjFNM2IzQnZhVzFpT0dReWFHMUdSRTkyYm1oU1JrZFpkR1I2T0ZjeWR5SjkiLCJqdGkiOiIzZjJkZGRhMS1mNzVmLTRiMTktOThiMS02MWMwMjcyMDczMDIiLCJzdGF0dXMiOnsic3RhdHVzX2xpc3QiOnsiaWR4IjoyNSwidXJpIjoiaHR0cHM6Ly9pc3N1ZXIuYWRtaW4uY2FybWVudGlzLmlvL2FwaS9kZW1vLXZjLWVtYWlsL2NyZWRlbnRpYWwvc3RhdHVzIn19LCJfc2QiOlsiM0lQUnFNVVN2WGlEYXNaNXFFNGJVSHJBUkh5UjhpY3Qyd2lPQ2NQZnRxMCIsImZxVDBMZ1A3dVhsUnk3T2VYRmtNX3JOcmwtaU1BRzBuSjV2V2hYN1g3dnMiLCJoMXZfSWpPOUtZUW93N1l6QTM0YXZaRHI3V0w2ekxDNHFhVktHcThPX0ZvIiwidFJkdVdZTC1HMlkwck5CREtqVDdITndCQkxUdkg5S2Y4T1dZZGUtNXhFVSJdLCJfc2RfYWxnIjoic2hhLTI1NiJ9.-u4I6lGE8PkLKLQ_gGtFRf9pmPn9_A3XHZIwo-9ggJFpKuo7pGOkPGE_-h2-IFpl8LLaYBB1TgGszz4rc67KBQ~WyJYN25IZ01KUEdVY1laSmR0N2dfd3hnIiwiZW1haWwiLCJnYWVsLm1hcmNhZGV0QGNhcm1lbnRpcy5pbyJd~eyJ0eXAiOiJrYitqd3QiLCJhbGciOiJSUzI1NiJ9.eyJub25jZSI6ImlDdllUTEpBbTNOMUNkd24xdmxsREp5M2xJL1BQejlHTy9lUFdjajUxYjA9IiwiaWF0IjoxNzkyNDE1MzkxLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjUxNzMiLCJzZF9oYXNoIjoiRURBZDBjeXU2WnRWdWNxN00wcTl0Zkc0WHB6UDdfcDFSWFgxM2dWRENxdyJ9.cxFYcYdKQuxZCzK-PnZdu1iZhxGWSYiTIfXmBnkRLO-i_8oHCBJufE-BqnXE-zV7W5T7kySzQ4PKyihXzPAaKDncNi_V1qOHaXqerei1qIH5uj7ORb5oz88LeA_EjTb0hQGAC5MTlSe95K9PgFeRDvjGbJ1dqi_Ovc9fxbbLJ33lSaLmd30L6cFbmnLrJe3z4zyjIC4bonHKMct84vB2pPldVmamWgUBDTCe7L6YOjw4sVni8Jok2sYe6YAlQYn83-FnEOc0BRRnyT02ym52KOsrIRGIwU0Lw-L5WJgsQxPT2oa1QJQfLR1ceYuf-fr2RPUKF-RK1qQT4ZC-4gnhCg"
                }
            },
            "receptionApproval": {
                "__signature__": {
                    "signatureType": "json-canonical+utf8",
                    "context": {
                        "signedAt": 1792488809008,
                        "purpose": "FileSign: approve the reception of a message"
                    },
                    "signature": "H6Eo+zPszAIRYSZP7bliJY2Xx9b9rAFwiyQ2o3HkRT0VoksGHfNQxiLr2Xl+BsqA1RNK0ER2twM3IKeAjLfd8INllhv4vO+Rws20hc3EfA4hd5B2WFNnOG/3pnvOkb5pSrRB6VLSbg3aof5vXhp/rKC29FgzOSW2nbCJzUjJFUgVSTyS8onKX7W9o4EnXwQC3Z7jkPyjqvoiyvWIGnfrSIkf0JFwLzDc8x6dq/sd/mUzu83KEeiWqocHspun2UG0nhav2HwEu6nTUuDf2izqsr0UU9y67MJdwpd7toLB+A02MqpS8MYYD0jUeTEMp9lf3es6YNi+sIti89VMdUUIWA==",
                    "payload": {
                        "type": "fileSign/receptionApproval",
                        "messageId": 6,
                        "virtualBlockchainId": "E60400A986D1626628D6918FA293B4F26905905CC8FD8639E1DDE6024A37F4F2",
                        "senderEmail": "gael.marcadet@carmentis.io",
                        "recipientEmail": "gael.marcadet@carmentis.io",
                        "files": [
                            {
                                "filename": "1792488694704-129258100",
                                "sha256": "e13d8cc5233bb584727bb1e6f568396a312eb89ee132af849c5bc1b28adb201a",
                                "size": 88
                            }
                        ]
                    },
                    "publicKey": "did:jwk:eyJhbGciOiJSUzI1NiIsImUiOiJBUUFCIiwia3R5IjoiUlNBIiwibiI6IjZZdDBoOVgxSGxJV01qUURycVh2Z1RNdlducU9sRE51bjYxXzNXUGQyYWc3a2FDYTZrcF9udTl2TFl2SDdVN3NpMDN6aU9SRGZaU1RvdlhoRmV4SEFZeWlSQ0hHVUtfUXpwNDU0QWRENlY2TTJxekFyLV9IbkJlclhHYW5wYkhxM041cDBNX1B5RklEVjVmR3pmU2RfRF9BZFdQM2dPc1QtOEZzRVFGajJGTFJYc2Q1QTFCY09OclZYRXV3ZDhfS3RSeENSRTNEOVNVb0RaU09KVV9kRFZEdDdENXRMbktzblpCOURZUHJOVm1qNEpwWjEwVThCS1FYcGxWNmItOUNLM1lKODhIdUIxUUJKRk9tbjRXNng5dFhLR1lnMVFJYk8zMkJ1RzJXb3lKR3JFaklFaEpBLVpnV1M3b3BvaW1iOGQyaG1GRE92bmhSRkdZdGR6OFcydyJ9",
                    "signatureEncoding": "base64"
                }
            }
        }
    },
    "fileSignCert": {
        "x509Chain": [
            {
                "info": {
                    "notBefore": "2026-10-19T13:36:23.000Z",
                    "notAfter": "2027-10-19T13:36:23.000Z",
                    "serialNumber": "7bf9b84fbd4bbf4dbc2c4155fca225ed6429fed8",
                    "selfSigned": true
                },
                "subject": {
                    "2.5.4.3": {
                        "shortName": "CN",
                        "description": "Common Name",
                        "values": [
                            "File-Sign"
                        ]
                    }
                },
                "issuer": {
                    "2.5.4.3": {
                        "shortName": "CN",
                        "description": "Common Name",
                        "values": [
                            "File-Sign"
                        ]
                    }
                },
                "extensions": {
                    "2.5.29.35": {
                        "shortName": "2.5.29.35",
                        "description": "",
                        "values": [
                            "30168014233E46DEC031C7576B414E05E2332A0FC4544B4E"
                        ]
                    },
                    "2.5.29.19": {
                        "shortName": "2.5.29.19",
                        "description": "",
                        "values": [
                            "3000"
                        ]
                    },
                    "2.5.29.15": {
                        "shortName": "2.5.29.15",
                        "description": "",
                        "values": [
                            "030206C0"
                        ]
                    },
                    "2.5.29.14": {
                        "shortName": "2.5.29.14",
                        "description": "",
                        "values": [
                            "0414233E46DEC031C7576B414E05E2332A0FC4544B4E"
                        ]
                    }
                }
            }
        ]
    }
};
(async function () {
    const renderer = new TemplateRenderer;
    const result = await renderer.render(template, data);
    const html = `<html>
<head>
<style>
body { font-family: "Arial" }
.injected { background-color: #e0fff0; color: #30c070 }
</style>
</head>
<body>
${result}
</body>
</html>`;
    console.log(html);
})();
