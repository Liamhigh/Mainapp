
// --- report.worker.ts ---
// This worker runs in the background to process large .verum.bin files
// without freezing the main UI thread.

// Since this is a worker, we load global scripts using importScripts
// Note: These URLs must be accessible from the worker's context.
try {
    importScripts(
        "https://cdn.jsdelivr.net/npm/protobufjs@7.3.2/dist/protobuf.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
    );
} catch (e) {
    console.error('Failed to load worker scripts:', e);
    // Post an error back to the main thread if scripts fail to load.
    self.postMessage({ type: 'error', message: 'Failed to load core libraries in background worker.' });
}


// Declare global variables that are loaded by the scripts
declare const protobuf: any;
declare const jspdf: any;

// --- TYPE DEFINITIONS (Copied from types.ts) ---
interface LegalSubjectFinding {
  subject: string;
  keyPoints: string[];
  evidence: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}
interface DishonestyFinding {
  flag: string;
  description: string;
  evidence: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}
interface RecommendedAction {
  jurisdiction: string;
  action: string;
  legalBasis: string;
}
interface EvidenceIndexItem {
  id: string;
  description: string;
  pageNumber: number;
  documentReference: string;
}
interface EvidenceSpotlightItem {
  title: string;
  significance: string;
  evidenceReference: string;
  pageNumber: number;
}
interface AnalysisResult {
  documentHash: string;
  fileName: string;
  caseNarrative: string;
  evidenceSpotlight: EvidenceSpotlightItem[];
  preAnalysisChecks: {
    extractionProtocol: boolean;
    preservationFlags: boolean;
    scope: boolean;
  };
  criticalLegalSubjects: LegalSubjectFinding[];
  dishonestyDetectionMatrix: DishonestyFinding[];
  evidenceIndex: EvidenceIndexItem[];
  actionableOutput: {
    topLiabilities: { name: string, severity: 'High' | 'Critical' }[];
    dishonestyScore: number;
    recommendedActions: RecommendedAction[];
    summary: string;
  };
  postAnalysisDeclaration: {
    extractionComplete: boolean;
    integritySealsVerified: boolean;
    logs: string;
    seal: string;
  };
}


// --- REPORT SERIALIZER LOGIC (Copied from services/reportSerializer.ts) ---
const protoDefinition = `
syntax = "proto3";
package verumomnis;
message EvidenceIndexItem { string id = 1; string description = 2; uint32 page_number = 3; string document_reference = 4; }
message EvidenceSpotlightItem { string title = 1; string significance = 2; string evidence_reference = 3; uint32 page_number = 4; }
message LegalSubjectFinding { string subject = 1; repeated string key_points = 2; string evidence = 3; string severity = 4; }
message DishonestyFinding { string flag = 1; string description = 2; string evidence = 3; string severity = 4; }
message RecommendedAction { string jurisdiction = 1; string action = 2; string legal_basis = 3; }
message TopLiability { string name = 1; string severity = 2; }
message AnalysisResult {
  uint32 protocol_version = 1; string analysis_timestamp_utc = 2; string document_hash = 3; string file_name = 4; string case_narrative = 5;
  repeated EvidenceSpotlightItem evidence_spotlight = 6; repeated EvidenceIndexItem evidence_index = 7;
  message PreAnalysisChecks { bool extraction_protocol = 1; bool preservation_flags = 2; bool scope = 3; }
  PreAnalysisChecks pre_analysis_checks = 8;
  repeated LegalSubjectFinding critical_legal_subjects = 9; repeated DishonestyFinding dishonesty_detection_matrix = 10;
  message ActionableOutput { repeated TopLiability top_liabilities = 1; uint32 dishonesty_score = 2; repeated RecommendedAction recommended_actions = 3; string summary = 4; }
  ActionableOutput actionable_output = 11;
  message PostAnalysisDeclaration { bool extraction_complete = 1; bool integrity_seals_verified = 2; string logs = 3; string seal = 4; }
  PostAnalysisDeclaration post_analysis_declaration = 12;
}`;

let ReportMessage: any = null;
const initialize = () => {
    if (ReportMessage || typeof protobuf === 'undefined') return;
    const root = protobuf.parse(protoDefinition).root;
    ReportMessage = root.lookupType("verumomnis.AnalysisResult");
};

const fromProtoPayload = (payload: any): AnalysisResult => ({
    documentHash: payload.document_hash, fileName: payload.file_name, caseNarrative: payload.case_narrative,
    evidenceSpotlight: payload.evidence_spotlight.map((i: any) => ({ title: i.title, significance: i.significance, evidenceReference: i.evidence_reference, pageNumber: i.page_number })),
    evidenceIndex: payload.evidence_index.map((i: any) => ({ id: i.id, description: i.description, pageNumber: i.page_number, documentReference: i.document_reference })),
    preAnalysisChecks: { extractionProtocol: payload.pre_analysis_checks.extraction_protocol, preservationFlags: payload.pre_analysis_checks.preservation_flags, scope: payload.pre_analysis_checks.scope },
    criticalLegalSubjects: payload.critical_legal_subjects.map((i: any) => ({ subject: i.subject, keyPoints: i.key_points, evidence: i.evidence, severity: i.severity })),
    dishonestyDetectionMatrix: payload.dishonesty_detection_matrix.map((i: any) => ({ flag: i.flag, description: i.description, evidence: i.evidence, severity: i.severity })),
    actionableOutput: {
        topLiabilities: payload.actionable_output.top_liabilities, dishonestyScore: payload.actionable_output.dishonesty_score,
        recommendedActions: payload.actionable_output.recommended_actions.map((i: any) => ({ jurisdiction: i.jurisdiction, action: i.action, legalBasis: i.legal_basis })),
        summary: payload.actionable_output.summary,
    },
    postAnalysisDeclaration: { extractionComplete: payload.post_analysis_declaration.extraction_complete, integritySealsVerified: payload.post_analysis_declaration.integrity_seals_verified, logs: payload.post_analysis_declaration.logs, seal: payload.post_analysis_declaration.seal },
});

const decodeReport = (buffer: Uint8Array): Promise<AnalysisResult> => new Promise((resolve, reject) => {
    initialize();
    if (!ReportMessage) return reject(new Error("Protobuf message type not initialized."));
    try {
        const decodedMessage = ReportMessage.decode(buffer);
        const object = ReportMessage.toObject(decodedMessage, { longs: String, enums: String, bytes: String });
        resolve(fromProtoPayload(object));
    } catch (e) {
        reject(e);
    }
});


// --- PDF GENERATOR LOGIC (Copied from services/geminiService.ts and modified) ---
const generatePdfReport = async (result: AnalysisResult, fileName: string): Promise<Blob> => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    
    // --- Entire PDF generation logic from geminiService.ts ---
    // (This code is long and has been condensed for brevity in this comment block)
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    const checkPageBreak = () => { if (y > 255) { doc.addPage(); y = 20; } }
    const addHeader = (title: string, onFirstPage: boolean = false) => {
        if (!onFirstPage) y = 20;
        doc.setFont('Roboto Mono', 'bold'); doc.setFontSize(16);
        doc.text("DEEPSEEK VERUM OMNIS: INSTITUTIONAL REVIEW", pageWidth / 2, y, { align: 'center' }); y += 7;
        doc.setFont('Source Code Pro', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
        doc.text(`Forensic Analysis Report: ${title}`, pageWidth / 2, y, { align: 'center' }); y += 10;
        doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 10;
    };
    const addSectionTitle = (title: string) => {
        checkPageBreak();
        doc.setFillColor(230, 230, 250); doc.rect(margin, y - 5, contentWidth, 10, 'F');
        doc.setFont('Roboto Mono', 'bold'); doc.setFontSize(12); doc.setTextColor(50);
        doc.text(title.toUpperCase(), margin + 3, y); y += 12;
    };
    const addText = (text: string | string[], size: number, weight: 'normal' | 'bold' = 'normal', indent = 0) => {
        checkPageBreak(); doc.setFontSize(size); doc.setFont('Source Code Pro', weight); doc.setTextColor(34, 34, 34);
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        doc.text(lines, margin + indent, y); y += (lines.length * size * 0.45);
        return lines.length;
    };
    const addTable = (head: any[], body: any[], startY: number) => {
      doc.autoTable({
          head, body, startY, theme: 'grid',
          headStyles: { fillColor: [50, 50, 50], textColor: 255, font: 'Roboto Mono', fontStyle: 'bold' },
          styles: { font: 'Source Code Pro', fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      return doc.autoTable.previous.finalY;
    };

    // --- REPORT CONTENT ---
    addHeader(fileName, true);
    addSectionTitle("Executive Summary & Actionable Output");
    addText(result.actionableOutput.summary, 9); y += 5;
    addText(`DISHONESTY SCORE: ${result.actionableOutput.dishonestyScore}%`, 10, 'bold'); y += 8;
    
    let tableY = y;
    let head = [["Jurisdiction", "Recommended Action", "Legal Basis"]];
    let body = result.actionableOutput.recommendedActions.map(a => [a.jurisdiction, a.action, a.legalBasis]);
    y = addTable(head, body, tableY); y += 10;

    doc.addPage();
    addHeader(fileName);
    addSectionTitle("Case Narrative");
    addText(result.caseNarrative, 9); y+=10;

    checkPageBreak();
    addSectionTitle("Evidence Spotlight");
    result.evidenceSpotlight.forEach(item => {
        // --- Measurement Phase ---
        const startY = y;
        doc.setFont('Source Code Pro', 'bold');
        doc.setFontSize(10);
        const titleLines = doc.splitTextToSize(`★ ${item.title} (Page ${item.pageNumber})`, contentWidth);
        
        doc.setFont('Source Code Pro', 'normal');
        doc.setFontSize(9);
        const significanceLines = doc.splitTextToSize(item.significance, contentWidth - 5);

        // Calculate heights
        const titleHeight = titleLines.length * 10 * 0.45;
        const significanceHeight = significanceLines.length * 9 * 0.45;
        const blockHeight = titleHeight + significanceHeight + 12; // 12 for vertical padding (top/bottom)

        // --- Page Break Check ---
        if (startY + blockHeight > 280) { // Check if the block fits
            doc.addPage();
            y = 20; // Reset y on new page
            addHeader(fileName);
            addSectionTitle("Evidence Spotlight"); // Re-add section title
        }

        // --- Drawing Phase ---
        // Use the y after potential page break
        const drawStartY = y;

        // Draw background rectangle
        doc.setFillColor(255, 250, 230); // Use light yellow
        doc.rect(margin, drawStartY, contentWidth, blockHeight, 'F');
        
        // Position cursor to draw text inside the box
        y = drawStartY + 6; // Top padding

        // Draw text. addText will handle y incrementing.
        addText(`★ ${item.title} (Page ${item.pageNumber})`, 10, 'bold');
        addText(item.significance, 9, 'normal', 5);

        // Ensure y is positioned after the entire block for the next item
        y = drawStartY + blockHeight + 4; // Add 4 for margin between blocks
    });

    doc.addPage();
    addHeader(fileName);
    addSectionTitle("Critical Legal Subjects");
    head = [["Subject", "Key Points", "Evidence", "Severity"]];
    body = result.criticalLegalSubjects.map(s => [s.subject, s.keyPoints.join('\n'), s.evidence, s.severity]);
    y = addTable(head, body, y); y += 10;

    checkPageBreak();
    addSectionTitle("Dishonesty Detection Matrix");
    head = [["Flag", "Description", "Evidence", "Severity"]];
    body = result.dishonestyDetectionMatrix.map(d => [d.flag, d.description, d.evidence, d.severity]);
    y = addTable(head, body, y); y += 10;
    
    doc.addPage();
    addHeader(fileName);
    addSectionTitle("Evidence Index");
    head = [["ID", "Description", "Page"]];
    // FIX: Convert pageNumber to string to match the inferred type of `body` (`string[][]`).
    body = result.evidenceIndex.map(e => [e.id, e.description, String(e.pageNumber)]);
    y = addTable(head, body, y);

    // --- MODIFICATION: Return Blob instead of saving ---
    return doc.output('blob');
};

// --- WORKER MAIN LOGIC ---
self.onmessage = async (event: MessageEvent<File>) => {
    const file = event.data;

    try {
        self.postMessage({ type: 'progress', message: 'Reading file into memory...' });
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        self.postMessage({ type: 'progress', message: 'Decoding binary report...' });
        const decodedResult = await decodeReport(uint8Array);

        self.postMessage({ type: 'progress', message: 'Constructing PDF from report data...' });
        const pdfBlob = await generatePdfReport(decodedResult, decodedResult.fileName);

        self.postMessage({ type: 'success', blob: pdfBlob, fileName: decodedResult.fileName });

    } catch (e: any) {
        console.error("Error in report worker:", e);
        self.postMessage({ type: 'error', message: e.message || 'An unknown error occurred.' });
    }
};
