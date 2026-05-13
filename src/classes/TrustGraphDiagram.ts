import { TrustGraph } from "./TrustGraph";
import {
    type DagreGraphConfig,
    dagre,
    sugiyama,
    decrossOpt,
    coordQuad
} from "d3-dag";
import {
    type GraphEdge,
    type Block,
    type Connection,
    type GraphNode,
    type ModalContent
} from "./types"

const GREEN = "#00c950";
const RED = "#da4453";
const GREY = "#c0c0c0";
const GREEN_BG = "#ccffcc";
const RED_BG = "#ffbbaa";
const GREY_BG = "#eeeeee";
const WIDTH = 80;
const HEIGHT = 40;
const NODESEP = 80;
const RANKSEP = 50;
const ICON_SCALE = 0.25;

export class TrustGraphDiagram {
    private nodes: GraphNode[] = [];
    private edges: GraphEdge[] = [];
    private graphConfig: DagreGraphConfig;
    private blocks: Block[] = [];

    constructor(trustGraph: TrustGraph) {
        this.nodes = trustGraph.getNodes();
        this.edges = trustGraph.getEdges();
        const { blocks, graphConfig } = this.build();
        this.blocks = blocks;
        this.graphConfig = graphConfig;
    }

    build() {
        const blocks: Block[] = [];
        let validChain = true;

        this.nodes.forEach((node, ndx) => {
            let modalContent: ModalContent;

            switch(node.type) {
                case "block": {
                    modalContent = this.proofContent(node);
                    break;
                }
                case "vc": {
                    modalContent = this.vcContent(node);
                    break;
                }
                case "x509": {
                    modalContent = this.x509Content(node, ndx);
                    break;
                }
            }

            blocks.push({
                id: node.id,
                label: node.label,
                modalContent,
                width: WIDTH,
                height: HEIGHT,
                x: 0,
                y: 0,
                textX: 0,
                textY: 0,
                rx: 15,
                fill: node.valid ? (validChain ? GREEN_BG : GREY_BG) : RED_BG,
                stroke: node.valid ? (validChain ? GREEN : GREY) : RED,
                iconPaths: node.valid ? TrustGraphDiagram.checkMarkPaths() : TrustGraphDiagram.crossMarkPaths(),
                iconTransform: '',
            });
            validChain &&= node.valid;
        });
        /*
                console.log("blocks", blocks);
                const stratify = graphStratify();
                const dag = stratify(blocks);
                console.log("dag before", dag);
                const layout = sugiyama();
                layout(dag);
                console.log("block", blocks);
                console.log("dag after", dag);
        */
        const grf = new dagre.graphlib.Graph();
        grf.setGraph({ rankdir: "LR", nodesep: NODESEP, ranksep: RANKSEP });
        grf.setDefaultEdgeLabel(() => ({}));
        for (const node of blocks) {
            grf.setNode(node.id, { width: WIDTH, height: HEIGHT });
        }
        for (const edge of this.edges) {
            grf.setEdge(edge.source, edge.target);
        }
        const layout = sugiyama();
        dagre.layout(grf, layout.decross(decrossOpt()).coord(coordQuad()));

        const graphConfig = grf.graph();

        grf.edges().forEach((e) => {
            console.log("Edge " + e.v + " -> " + e.w + ": " + JSON.stringify(grf.edge(e.v, e.w)));
        });

        blocks.forEach((node, ndx) => {
            const pos = grf.node(node.id);
            const y = pos.x - HEIGHT / 2 + 3;
            const x = pos.y - WIDTH / 2 + 3;
            const iconX = x + (WIDTH - 64 * ICON_SCALE) / 2;
            const iconY = y + HEIGHT / 2;
            node.x = x;
            node.y = y;
            node.textX = x + WIDTH / 2;
            node.textY = y + HEIGHT * 2 / 5;
            node.iconTransform = `translate(${iconX}, ${iconY}) scale(${ICON_SCALE})`;
        });

        return { blocks, graphConfig };
    }

    getWidth() {
        return (this.graphConfig.height || 0) + 6;
    }

    getHeight() {
        return (this.graphConfig.width || 0) + 6;
    }

    getBlocks(): Block[] {
        return this.blocks;
    }

    getConnections(): Connection[] {
        const connections: Connection[] = [];
        let validChain = true;

        this.edges.forEach((edge, ndx) => {
            const from = edge.source;
            const to = edge.target;

            connections.push({
                from,
                to,
                d: this.curvedPath(from, to),
                stroke: validChain ? GREEN : GREY,
                strokeWidth: 3,
                markerEnd: 'arrow'
            });
            validChain &&= true // node.valid;
        });

        return connections;
    }

    curvedPath(from: string, to: string) {
        const x1 = this.getBlockRight(from);
        const y1 = this.getBlockMiddleY(from);
        const x2 = this.getBlockLeft(to);
        const y2 = this.getBlockMiddleY(to);

        const x3 = x1 + (x2 - x1) * 3 / 4;
        const dx = (x3 - x1) / 2;

        return `M ${x1} ${y1}
          C ${x1 + dx} ${y1},
            ${x3 - dx} ${y2},
            ${x3} ${y2}
          L ${x2} ${y2}`;
    }

    getBlockOrFail(id: string) {
        const block = this.blocks.find((b) => b.id === id);
        if (block === undefined) {
            throw new Error(`Block ${id} not found`);
        }
        return block;
    }

    getBlockRight(id: string) {
        const b = this.getBlockOrFail(id);
        return b.x + b.width
    }

    getBlockLeft(id: string) {
        const b = this.getBlockOrFail(id);
        return b.x
    }

    getBlockMiddleY(id: string) {
        const b = this.getBlockOrFail(id);
        return b.y + b.height / 2
    }

    proofContent(node: GraphNode): ModalContent {
        return {
            ...TrustGraphDiagram.validityTag(node.valid),
            svg: TrustGraphDiagram.proofSvg(),
            title: "On-chain Data",
            sections: node.sections,
            verifications: node.verifications
        };
    }

    vcContent(node: GraphNode): ModalContent {
        return {
            ...TrustGraphDiagram.validityTag(node.valid),
            svg: TrustGraphDiagram.vcSvg(),
            title: "Verifiable Credential",
            sections: node.sections,
            verifications: node.verifications
        };
    }

    x509Content(node: GraphNode, ndx: number) {
        return {
            ...TrustGraphDiagram.validityTag(node.valid),
            svg: TrustGraphDiagram.certificateSvg(),
            title: "X509 Certificate",
            sections: node.sections,
            verifications: node.verifications
        };
    }

    arrow(x0: number, y0: number, x1: number, y1: number, color: string) {
        return `<path d="M${x0} ${y0} L${x1} ${y1}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#arrow)"/>`;
    }

    static validityTag(valid: boolean) {
        const tagColor = valid ? "green" : "red";
        const tagLabel = valid ? "Valid" : "Invalid";
        return { tagLabel, tagColor };
    }

    static proofSvg() {
        // icon from VK Icons set (https://github.com/VKCOM/icons)
        // licensed under the MIT License
        return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="currentColor" viewBox="0 0 56 56"><path fill-rule="evenodd" d="M39.5 40a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-3 0v-2a1.5 1.5 0 0 1 1.5-1.5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M41 41.5a1.5 1.5 0 0 0-3 0v2a1.5 1.5 0 0 0 3 0v-2Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M49.51 36.457a4.5 4.5 0 0 0-1.967-1.967c-.501-.255-1.02-.368-1.543-.425V32.5a6.5 6.5 0 1 0-13 0v1.565c-.523.057-1.042.17-1.543.425a4.5 4.5 0 0 0-1.966 1.967c-.29.568-.397 1.157-.445 1.75C29 38.77 29 39.453 29 40.243v4.516c0 .79 0 1.473.046 2.034.048.594.155 1.183.445 1.751a4.5 4.5 0 0 0 1.966 1.967c.568.289 1.157.396 1.75.444.562.046 1.245.046 2.035.046h8.516c.79 0 1.473 0 2.034-.046.594-.048 1.183-.155 1.751-.444a4.5 4.5 0 0 0 1.967-1.967c.289-.568.396-1.157.444-1.75.046-.562.046-1.244.046-2.035v-4.516c0-.79 0-1.473-.046-2.034-.048-.594-.155-1.183-.444-1.751Zm-16.058.579c-.408.033-.559.09-.633.127a1.5 1.5 0 0 0-.656.656c-.037.074-.094.225-.127.633C32 38.877 32 39.435 32 40.3v4.4c0 .865.001 1.423.036 1.848.033.408.09.559.127.633a1.5 1.5 0 0 0 .656.656c.074.037.225.094.633.127.425.035.983.036 1.848.036h8.4c.865 0 1.423-.001 1.848-.036.408-.033.559-.09.633-.127a1.5 1.5 0 0 0 .656-.656c.037-.074.094-.225.127-.633.035-.425.036-.983.036-1.848v-4.4c0-.865-.001-1.423-.036-1.848-.033-.408-.09-.559-.127-.633a1.5 1.5 0 0 0-.656-.656c-.074-.037-.225-.094-.633-.127C45.123 37 44.565 37 43.7 37h-8.4c-.865 0-1.423.001-1.848.036ZM36 32.5a3.5 3.5 0 1 1 7 0V34h-7v-1.5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M28 5c-5.8 0-11.117.915-15.041 2.446-1.957.764-3.643 1.71-4.865 2.838C6.87 11.413 6 12.836 6 14.5v25c0 1.49.7 2.792 1.725 3.856 1.017 1.056 2.422 1.954 4.055 2.7 3.269 1.494 7.728 2.503 12.696 2.83a1.5 1.5 0 1 0 .197-2.994c-4.723-.31-8.801-1.264-11.646-2.564-1.425-.652-2.472-1.359-3.142-2.054C9.222 40.586 9 39.991 9 39.5v-7.54c.867.636 1.886 1.202 3.007 1.699 3.396 1.503 8.023 2.498 13.157 2.767a1.5 1.5 0 0 0 .158-2.996c-4.884-.256-9.129-1.199-12.1-2.514-1.489-.66-2.586-1.381-3.29-2.095C9.231 28.114 9 27.501 9 27v-7.54c1.099.806 2.448 1.505 3.959 2.094C16.883 23.085 22.201 24 28 24c5.8 0 11.117-.915 15.041-2.446 1.51-.59 2.86-1.288 3.959-2.095v6.717a1.5 1.5 0 0 0 3 0V14.5c0-1.664-.87-3.087-2.094-4.216-1.222-1.128-2.908-2.074-4.865-2.838C39.117 5.915 33.799 5 28 5Zm-17.872 7.489C9.278 13.274 9 13.954 9 14.5c0 .545.277 1.226 1.128 2.012.853.786 2.169 1.564 3.922 2.247C17.546 20.124 22.477 21 28 21s10.454-.876 13.95-2.24c1.753-.684 3.07-1.462 3.922-2.248.85-.786 1.128-1.467 1.128-2.012 0-.545-.277-1.226-1.128-2.011-.853-.787-2.169-1.565-3.922-2.248C38.454 8.876 33.523 8 28 8s-10.454.876-13.95 2.24c-1.753.684-3.07 1.462-3.922 2.248Z" clip-rule="evenodd"/></svg>`;
    }

    static certificateSvg() {
        // by Nice and Serious
        // made available under the Creative Commons CC0 1.0 Universal Public Domain Dedication
        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve" width="80"><path d="M65.8,43.4c0,1-0.8,1.8-1.8,1.8H33.5c-1,0-1.8-0.8-1.8-1.8s0.8-1.8,1.8-1.8h30.4C64.9,41.5,65.8,42.3,65.8,43.4z M31.1,32.2  v-8.1c0-1.6,1.3-3,3-3H63c1.6,0,3,1.3,3,3v8.1c0,1.6-1.3,3-3,3H34.1C32.4,35.2,31.1,33.9,31.1,32.2z M34.8,31.5h27.5v-6.7H34.8V31.5  z M78.1,73.3L78,88.5c0,3.1-2.1,3.3-2.5,3.3c-0.6,0-1.3-0.2-1.9-0.7l-5-4.2l-4.8,4c-0.5,0.4-1.3,1-2.2,1c-1.1,0-2.2-0.8-2.4-2.4  c0-0.1,0-0.1,0-0.2l0-3H25.8c-2.7,0-4.9-2.2-4.9-4.9V14.9c0-2.7,2.2-4.9,4.9-4.9h46.5c2.7,0,4.9,2.2,4.9,4.9v37.5  c1.5,1.1,2.7,2.6,3.6,4.3C83.8,62.3,82.5,69.2,78.1,73.3z M77.5,58.5c-0.8-1.5-2-2.8-3.4-3.7c-0.3-0.2-0.6-0.3-0.8-0.5  c-0.1,0-0.2-0.1-0.3-0.1c-0.4-0.2-0.7-0.3-1.1-0.5c0,0,0,0-0.1,0c-2.1-0.7-4.5-0.7-6.6,0.1c0,0-0.1,0-0.1,0  c-0.4,0.2-0.8,0.3-1.2,0.6c-3.4,1.8-5.3,5.3-5.3,8.9c0,0,0,0,0,0c0,0,0,0,0,0c0,1.6,0.4,3.2,1.2,4.8c0.2,0.4,0.4,0.7,0.7,1.1  c0.1,0.1,0.1,0.2,0.2,0.3c0.2,0.3,0.4,0.5,0.6,0.7c0.1,0.1,0.1,0.1,0.2,0.2c0.3,0.3,0.6,0.6,0.9,0.8c0,0,0.1,0.1,0.1,0.1  c0.3,0.2,0.5,0.4,0.8,0.6c0,0,0.1,0.1,0.1,0.1c0.1,0,0.1,0.1,0.2,0.1c0.1,0,0.2,0.1,0.3,0.1c0.1,0.1,0.3,0.1,0.4,0.2  c2.3,1.1,4.9,1.3,7.4,0.6c0.1,0,0.3-0.1,0.4-0.1c0.1,0,0.1,0,0.2-0.1c0.1,0,0.2-0.1,0.3-0.1c0.3-0.1,0.6-0.3,0.9-0.4  c0.3-0.2,0.6-0.3,0.8-0.5c0.3-0.2,0.5-0.4,0.8-0.6C78.7,68.1,79.9,62.8,77.5,58.5z M59.2,82.4l0-7.1H33.5c-1,0-1.8-0.8-1.8-1.8  c0-1,0.8-1.8,1.8-1.8h24.1c0,0,0,0,0,0c-0.1-0.2-0.2-0.3-0.4-0.5c-0.1-0.1-0.2-0.2-0.2-0.3c-0.2-0.2-0.3-0.5-0.5-0.8  c0,0-0.1-0.1-0.1-0.1c-0.2-0.4-0.4-0.8-0.6-1.3c0,0,0,0,0,0c-0.4-1.1-0.7-2.2-0.9-3.3H33.5c-1,0-1.8-0.8-1.8-1.8s0.8-1.8,1.8-1.8  h21.4c0.1-0.7,0.2-1.4,0.4-2.1c0.5-1.5,1.2-2.9,2.1-4.1H33.5c-1,0-1.8-0.8-1.8-1.8c0-1,0.8-1.8,1.8-1.8h27.9  c0.2-0.1,0.4-0.2,0.6-0.4c0.4-0.2,0.8-0.4,1.3-0.6c0,0,0.1,0,0.1,0c1.6-0.7,3.4-1,5.2-1c1.7,0,3.3,0.3,4.8,0.9c0,0,0,0,0,0V14.9  c0-0.7-0.5-1.2-1.2-1.2H25.8c-0.7,0-1.2,0.5-1.2,1.2v66.2c0,0.7,0.5,1.2,1.2,1.2H59.2z M74.4,75.9c-0.1,0-0.1,0-0.2,0.1  c0,0-0.1,0-0.1,0.1c0,0-0.1,0-0.1,0c-0.2,0.1-0.4,0.1-0.6,0.2c-0.1,0-0.1,0-0.2,0.1c-0.1,0-0.2,0.1-0.3,0.1c0,0,0,0-0.1,0  c0,0,0,0-0.1,0c-0.1,0-0.1,0-0.2,0.1c0,0-0.1,0-0.1,0c-0.1,0-0.2,0-0.3,0.1c-0.1,0-0.3,0.1-0.5,0.1c-0.1,0-0.3,0.1-0.4,0.1  c0,0,0,0,0,0c0,0,0,0,0,0c-0.2,0-0.4,0.1-0.7,0.1c-0.1,0-0.3,0-0.4,0.1c0,0-0.1,0-0.1,0c-0.1,0-0.1,0-0.2,0c0,0,0,0,0,0  c-0.1,0-0.1,0-0.2,0c-0.3,0-0.6,0-0.8,0c0,0,0,0,0,0c0,0,0,0,0,0c-0.1,0-0.1,0-0.2,0c-0.1,0-0.1,0-0.2,0c0,0,0,0,0,0c0,0,0,0,0,0  c-0.3,0-0.7,0-1-0.1c0,0,0,0,0,0c0,0,0,0,0,0c0,0,0,0,0,0c0,0-0.1,0-0.1,0c0,0-0.1,0-0.1,0c-1.3-0.1-2.6-0.5-3.7-1c0,0,0,0,0,0  c0,0,0,0,0,0c-0.1-0.1-0.3-0.1-0.4-0.2c0,0,0,0,0,0l-0.1,10.9l4.5-3.8c0.3-0.3,0.8-0.4,1.2-0.4c0.4,0,0.9,0.1,1.2,0.4l4.5,3.8  L74.4,75.9z"></path></svg>`;
    }

    static vcSvg() {
        // derived from https://thenounproject.com
        // licensed under the Creative Commons Attribution 3.0 Unported license
        return (
            `<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 100 100" xml:space="preserve" width="80" height="80">` +
            `<g stroke="black" xmlns="http://www.w3.org/2000/svg" transform="matrix(0.75394364,0,0,0.75394364,1.0818615,1.4035878)" stroke-width="3">` +
            `<path d="M 122,36 H 76 V 11 H 54 V 36 H 8 c -3.8598633,0 -7,3.140137 -7,7 v 69 c 0,3.85986 3.1401367,7 7,7 h 114 c 3.85986,0 7,-3.14014 7,-7 V 43 c 0,-3.859863 -3.14014,-7 -7,-7 z M 56,13 H 74 V 43 H 56 Z m 20,32 h 7 c 1.654297,0 3,1.345703 3,3 v 4 c 0,1.654297 -1.345703,3 -3,3 H 47 c -1.654297,0 -3,-1.345703 -3,-3 v -4 c 0,-1.654297 1.345703,-3 3,-3 h 7 z m 51,67 c 0,2.75684 -2.24316,5 -5,5 H 8 c -2.7568359,0 -5,-2.24316 -5,-5 V 43 c 0,-2.756836 2.2431641,-5 5,-5 h 46 v 5 h -7 c -2.756836,0 -5,2.243164 -5,5 v 4 c 0,2.756836 2.243164,5 5,5 h 36 c 2.756836,0 5,-2.243164 5,-5 v -4 c 0,-2.756836 -2.243164,-5 -5,-5 h -7 v -5 h 46 c 2.75684,0 5,2.243164 5,5 z"/>` +
            `<path d="M 47,85 H 46.621094 L 36,94.393066 25.378906,85 H 25 c -8.270996,0 -15,6.729004 -15,15 v 7 c 0,1.10303 0.896973,2 2,2 h 48 c 1.103027,0 2,-0.89697 2,-2 v -7 C 62,91.729004 55.270996,85 47,85 Z m 13,22 H 12 v -7 C 12,92.956543 17.630859,87.203125 24.627441,87.005371 L 36,97.062988 47.372559,87.005371 C 54.369141,87.203125 60,92.956543 60,100 Z"/>` +
            `<path d="m 36,85 c 6.06543,0 11,-4.93457 11,-11 0,-6.06543 -4.93457,-11 -11,-11 -6.06543,0 -11,4.93457 -11,11 0,6.06543 4.93457,11 11,11 z m 0,-20 c 4.962402,0 9,4.037598 9,9 0,4.962402 -4.037598,9 -9,9 -4.962402,0 -9,-4.037598 -9,-9 0,-4.962402 4.037598,-9 9,-9 z"/>` +
            `<path d="M 117,65 H 75 c -0.552246,0 -1,0.447754 -1,1 0,0.552246 0.447754,1 1,1 h 42 c 0.55225,0 1,-0.447754 1,-1 0,-0.552246 -0.44775,-1 -1,-1 z"/>` +
            `<path d="M 117,79 H 75 c -0.552246,0 -1,0.447754 -1,1 0,0.552246 0.447754,1 1,1 h 42 c 0.55225,0 1,-0.447754 1,-1 0,-0.552246 -0.44775,-1 -1,-1 z"/>` +
            `<path d="M 117,93 H 75 c -0.552246,0 -1,0.447754 -1,1 0,0.552246 0.447754,1 1,1 h 42 c 0.55225,0 1,-0.447754 1,-1 0,-0.552246 -0.44775,-1 -1,-1 z"/>` +
            `<path d="M 117,107 H 75 c -0.552246,0 -1,0.44775 -1,1 0,0.55225 0.447754,1 1,1 h 42 c 0.55225,0 1,-0.44775 1,-1 0,-0.55225 -0.44775,-1 -1,-1 z"/>` +
            `</g>` +
            `</svg>`
        );
    }

    static checkMarkPaths() {
        // derived from Emoji One BW icons
        // licensed under the Creative Commons Attribution-Share Alike 4.0 International license
        return [
            {
                d: 'M32,2C15.431,2,2,15.432,2,32c0,16.568,13.432,30,30,30c16.568,0,30-13.432,30-30C62,15.432,48.568,2,32,2z M25.025,50 l-0.02-0.02L24.988,50L11,35.6l7.029-7.164l6.977,7.184l21-21.619L53,21.199L25.025,50z',
                fill: GREEN
            }
        ];
    }

    static crossMarkPaths() {
        // derived from an SVG by Fabián Alexis
        // licensed under the Creative Commons Attribution-Share Alike 3.0 Unported license
        return [
            {
                d: 'M32 2C15.431 2 2 15.432 2 32s13.432 30 30 30 30-13.432 30-30S48.568 2 32 2z',
                fill: RED
            },
            {
                d: 'M22 22l20 20M42 22L22 42',
                stroke: '#fff',
                fill: 'none',
                strokeWidth: 6,
                strokeLinecap: 'round'
            }
        ];
    }
}
