// This worker runs in the background to process .verum.bin files
// without freezing the main UI thread.

// Since this is a worker, we load global scripts using importScripts.
// Vite handles bundling this correctly when imported with `?worker`.
try {
    importScripts(
        "https://cdn.jsdelivr.net/npm/protobufjs@7.3.2/dist/protobuf.min.js"
    );
} catch (e) {
    console.error('Failed to load worker scripts:', e);
    self.postMessage({ type: 'error', message: 'Failed to load core libraries in background worker.' });
}

declare const protobuf: any;

interface AnalysisResult {
  documentHash: string;
  fileName: string;
  caseNarrative: string;
  // Other fields are omitted for brevity in the worker, as they are not directly used here
  // but are part of the decoded object.
  [key: string]: any;
}


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


self.onmessage = async (event: MessageEvent<File>) => {
    const file = event.data;

    try {
        self.postMessage({ type: 'progress', message: 'Reading file into memory...' });
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        self.postMessage({ type: 'progress', message: 'Decoding binary report...' });
        const decodedResult = await decodeReport(uint8Array);
        
        self.postMessage({ type: 'success', result: decodedResult });

    } catch (e: any) {
        console.error("Error in report worker:", e);
        self.postMessage({ type: 'error', message: e.message || 'An unknown error occurred.' });
    }
};
