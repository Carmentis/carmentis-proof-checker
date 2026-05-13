export interface ModalSection {
    name: string
    data: { [key: string]: string }
}

export interface Verification {
    operation: string
    success: boolean
}

export interface GraphNode {
    id: string
    label: string
    type: "block"|"vc"|"x509"
    valid: boolean
    sections: ModalSection[]
    verifications: Verification[]
}

export interface GraphEdge {
    source: string
    target: string
}

export interface ModalContent {
    svg: string
    title: string
    tagLabel: string
    tagColor: string
    sections: ModalSection[]
    verifications: Verification[]
}

export interface Block {
    id: string
    label: string
    modalContent: ModalContent
    x: number
    y: number
    width: number
    height: number
    rx: number
    fill: string
    stroke: string
    textX: number
    textY: number
    iconPaths: {
        d: string;
        fill?: string;
        stroke?: string,
        strokeWidth?: number,
        strokeLinecap?: "round"|"butt"|"square"|"inherit"
    }[]
    iconTransform?: string
}

export interface Connection {
    from: string
    to: string
    d: string
    stroke: string
    strokeWidth: number
    markerEnd?: string
}

export interface VerifiableCredential {
    type: "sdjwt"
    data: string
}
