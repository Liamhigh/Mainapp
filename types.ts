
export interface LegalSubjectFinding {
  subject: string;
  keyPoints: string[];
  evidence: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface DishonestyFinding {
  flag: string;
  description: string;
  evidence: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface RecommendedAction {
  jurisdiction: string;
  action: string;
  legalBasis: string;
}

export interface EvidenceIndexItem {
  id: string;
  description: string;
  pageNumber: number;
  documentReference: string;
}

export interface EvidenceSpotlightItem {
  title: string;
  significance: string;
  evidenceReference: string;
  pageNumber: number;
}

export interface AnalysisResult {
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
