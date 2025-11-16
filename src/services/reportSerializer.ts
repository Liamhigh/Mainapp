import type { AnalysisResult } from '../types';
import protobuf from 'protobufjs';

const PROTOCOL_VERSION = 5;

const protoDefinition = `
syntax = "proto3";

package verumomnis;

message EvidenceIndexItem {
  string id = 1;
  string description = 2;
  uint32 page_number = 3;
  string document_reference = 4;
}

message EvidenceSpotlightItem {
  string title = 1;
  string significance = 2;
  string evidence_reference = 3;
  uint32 page_number = 4;
}

message LegalSubjectFinding {
  string subject = 1;
  repeated string key_points = 2;
  string evidence = 3;
  string severity = 4;
}

message DishonestyFinding {
  string flag = 1;
  string description = 2;
  string evidence = 3;
  string severity = 4;
}

message RecommendedAction {
  string jurisdiction = 1;
  string action = 2;
  string legal_basis = 3;
}

message TopLiability {
    string name = 1;
    string severity = 2;
}

message AnalysisResult {
  uint32 protocol_version = 1;
  string analysis_timestamp_utc = 2;
  string document_hash = 3;
  string file_name = 4;
  string case_narrative = 5;
  
  repeated EvidenceSpotlightItem evidence_spotlight = 6;
  repeated EvidenceIndexItem evidence_index = 7;

  message PreAnalysisChecks {
    bool extraction_protocol = 1;
    bool preservation_flags = 2;
    bool scope = 3;
  }
  PreAnalysisChecks pre_analysis_checks = 8;
  
  repeated LegalSubjectFinding critical_legal_subjects = 9;
  repeated DishonestyFinding dishonesty_detection_matrix = 10;
  
  message ActionableOutput {
    repeated TopLiability top_liabilities = 1;
    uint32 dishonesty_score = 2;
    repeated RecommendedAction recommended_actions = 3;
    string summary = 4;
  }
  ActionableOutput actionable_output = 11;
  
  message PostAnalysisDeclaration {
    bool extraction_complete = 1;
    bool integrity_seals_verified = 2;
    string logs = 3;
    string seal = 4;
  }
  PostAnalysisDeclaration post_analysis_declaration = 12;
}
`;

const root = protobuf.parse(protoDefinition).root;
const ReportMessage = root.lookupType("verumomnis.AnalysisResult");

const toProtoPayload = (result: AnalysisResult): any => {
    return {
        protocol_version: PROTOCOL_VERSION,
        analysis_timestamp_utc: new Date().toISOString(),
        document_hash: result.documentHash,
        file_name: result.fileName,
        case_narrative: result.caseNarrative,
        evidence_spotlight: result.evidenceSpotlight.map(item => ({
            title: item.title,
            significance: item.significance,
            evidence_reference: item.evidenceReference,
            page_number: item.pageNumber,
        })),
        evidence_index: result.evidenceIndex.map(item => ({
            id: item.id,
            description: item.description,
            page_number: item.pageNumber,
            document_reference: item.documentReference,
        })),
        pre_analysis_checks: result.preAnalysisChecks ? {
            extraction_protocol: result.preAnalysisChecks.extractionProtocol,
            preservation_flags: result.preAnalysisChecks.preservationFlags,
            scope: result.preAnalysisChecks.scope,
        } : undefined,
        critical_legal_subjects: result.criticalLegalSubjects.map(item => ({
            subject: item.subject,
            key_points: item.keyPoints,
            evidence: item.evidence,
            severity: item.severity,
        })),
        dishonesty_detection_matrix: result.dishonestyDetectionMatrix.map(item => ({
            flag: item.flag,
            description: item.description,
            evidence: item.evidence,
            severity: item.severity,
        })),
        actionable_output: result.actionableOutput ? {
            top_liabilities: result.actionableOutput.topLiabilities,
            dishonesty_score: result.actionableOutput.dishonestyScore,
            recommended_actions: result.actionableOutput.recommendedActions.map(item => ({
                jurisdiction: item.jurisdiction,
                action: item.action,
                legal_basis: item.legalBasis,
            })),
            summary: result.actionableOutput.summary,
        } : undefined,
        post_analysis_declaration: result.postAnalysisDeclaration ? {
            extraction_complete: result.postAnalysisDeclaration.extractionComplete,
            integrity_seals_verified: result.postAnalysisDeclaration.integritySealsVerified,
            logs: result.postAnalysisDeclaration.logs,
            seal: result.postAnalysisDeclaration.seal,
        } : undefined,
    };
};

const fromProtoPayload = (payload: any): AnalysisResult => {
    return {
        documentHash: payload.document_hash,
        fileName: payload.file_name,
        caseNarrative: payload.case_narrative,
        evidenceSpotlight: payload.evidence_spotlight.map((item: any) => ({
            title: item.title,
            significance: item.significance,
            evidenceReference: item.evidence_reference,
            pageNumber: item.page_number,
        })),
        evidenceIndex: payload.evidence_index.map((item: any) => ({
            id: item.id,
            description: item.description,
            pageNumber: item.page_number,
            documentReference: item.document_reference,
        })),
        preAnalysisChecks: {
            extractionProtocol: payload.pre_analysis_checks.extraction_protocol,
            preservationFlags: payload.pre_analysis_checks.preservation_flags,
            scope: payload.pre_analysis_checks.scope,
        },
        criticalLegalSubjects: payload.critical_legal_subjects.map((item: any) => ({
            subject: item.subject,
            keyPoints: item.key_points,
            evidence: item.evidence,
            severity: item.severity,
        })),
        dishonestyDetectionMatrix: payload.dishonesty_detection_matrix.map((item: any) => ({
            flag: item.flag,
            description: item.description,
            evidence: item.evidence,
            severity: item.severity,
        })),
        actionableOutput: {
            topLiabilities: payload.actionable_output.top_liabilities,
            dishonestyScore: payload.actionable_output.dishonesty_score,
            recommendedActions: payload.actionable_output.recommended_actions.map((item: any) => ({
                jurisdiction: item.jurisdiction,
                action: item.action,
                legalBasis: item.legal_basis,
            })),
            summary: payload.actionable_output.summary,
        },
        postAnalysisDeclaration: {
            extractionComplete: payload.post_analysis_declaration.extraction_complete,
            integritySealsVerified: payload.post_analysis_declaration.integrity_seals_verified,
            logs: payload.post_analysis_declaration.logs,
            seal: payload.post_analysis_declaration.seal,
        },
    };
};

export const encodeReport = (result: AnalysisResult): Uint8Array | null => {
    const payload = toProtoPayload(result);
    
    const errMsg = ReportMessage.verify(payload);
    if (errMsg) {
        console.error("Protobuf verification error:", errMsg);
        throw Error(errMsg);
    }

    const message = ReportMessage.create(payload);
    return ReportMessage.encode(message).finish();
};

export const decodeReport = (buffer: Uint8Array): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
        try {
            const decodedMessage = ReportMessage.decode(buffer);
            const object = ReportMessage.toObject(decodedMessage, {
                longs: String,
                enums: String,
                bytes: String,
            });
            const result = fromProtoPayload(object);
            resolve(result);
        } catch (e) {
            console.error("Failed to decode report:", e);
            reject(e);
        }
    });
};

export const toBase64 = (buffer: Uint8Array): string => {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return window.btoa(binary);
}
