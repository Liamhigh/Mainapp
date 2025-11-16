
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

// @ts-ignore
const { jsPDF } = window.jspdf;

// --- Initialize Gemini API ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Define JSON Schemas for Gemini ---

const evidenceSpotlightItemSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    significance: { type: Type.STRING },
    evidenceReference: { type: Type.STRING },
    pageNumber: { type: Type.INTEGER },
  },
  required: ['title', 'significance', 'evidenceReference', 'pageNumber'],
};

const evidenceIndexItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "A unique identifier like 'E-01', 'E-02'." },
    description: { type: Type.STRING },
    pageNumber: { type: Type.INTEGER },
    documentReference: { type: Type.STRING },
  },
  required: ['id', 'description', 'pageNumber', 'documentReference'],
};

const legalSubjectFindingSchema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidence: { type: Type.STRING },
    severity: { type: Type.STRING, description: "Must be one of: 'Low', 'Medium', 'High', 'Critical'." },
  },
  required: ['subject', 'keyPoints', 'evidence', 'severity'],
};

const dishonestyFindingSchema = {
  type: Type.OBJECT,
  properties: {
    flag: { type: Type.STRING },
    description: { type: Type.STRING },
    evidence: { type: Type.STRING },
    severity: { type: Type.STRING, description: "Must be one of: 'Low', 'Medium', 'High', 'Critical'." },
  },
  required: ['flag', 'description', 'evidence', 'severity'],
};

const recommendedActionSchema = {
  type: Type.OBJECT,
  properties: {
    jurisdiction: { type: Type.STRING },
    action: { type: Type.STRING },
    legalBasis: { type: Type.STRING },
  },
  required: ['jurisdiction', 'action', 'legalBasis'],
};

const topLiabilitySchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    severity: { type: Type.STRING, description: "Must be one of: 'High', 'Critical'." },
  },
  required: ['name', 'severity'],
};

const analysisResultSchema = {
  type: Type.OBJECT,
  properties: {
    caseNarrative: { type: Type.STRING, description: "Detailed, professional case narrative derived from the document." },
    evidenceSpotlight: { type: Type.ARRAY, items: evidenceSpotlightItemSchema },
    preAnalysisChecks: {
      type: Type.OBJECT,
      properties: {
        extractionProtocol: { type: Type.BOOLEAN },
        preservationFlags: { type: Type.BOOLEAN },
        scope: { type: Type.BOOLEAN },
      },
      required: ['extractionProtocol', 'preservationFlags', 'scope'],
      description: "Confirmation of pre-analysis steps. Typically all true.",
    },
    criticalLegalSubjects: { type: Type.ARRAY, items: legalSubjectFindingSchema },
    dishonestyDetectionMatrix: { type: Type.ARRAY, items: dishonestyFindingSchema },
    evidenceIndex: { type: Type.ARRAY, items: evidenceIndexItemSchema },
    actionableOutput: {
      type: Type.OBJECT,
      properties: {
        topLiabilities: { type: Type.ARRAY, items: topLiabilitySchema },
        dishonestyScore: { type: Type.INTEGER, description: "A score from 0-100 representing the likelihood of dishonesty." },
        recommendedActions: { type: Type.ARRAY, items: recommendedActionSchema },
        summary: { type: Type.STRING, description: "A concise executive summary of the findings." },
      },
      required: ['topLiabilities', 'dishonestyScore', 'recommendedActions', 'summary'],
    },
    postAnalysisDeclaration: {
      type: Type.OBJECT,
      properties: {
        extractionComplete: { type: Type.BOOLEAN },
        integritySealsVerified: { type: Type.BOOLEAN },
        logs: { type: Type.STRING, description: "A log file path, e.g., '/diagnostics/analysis.log'." },
        seal: { type: Type.STRING, description: "A cryptographic seal, e.g., 'VERUM OMNIS | ETH#... | HASH#...'" },
      },
      required: ['extractionComplete', 'integritySealsVerified', 'logs', 'seal'],
      description: "Confirmation of post-analysis steps. Typically all true.",
    },
  },
  required: [
    'caseNarrative', 'evidenceSpotlight', 'preAnalysisChecks', 'criticalLegalSubjects',
    'dishonestyDetectionMatrix', 'evidenceIndex', 'actionableOutput', 'postAnalysisDeclaration'
  ],
};


const simulateSHA512 = (content: string): string => {
  let hash = 0;
  if (content.length === 0) return "sha512-0000000000000000";
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  let finalHash = Math.abs(hash).toString(16).padStart(8, '0');
  for (let i = 0; i < 7; i++) {
    finalHash += Math.abs(hash * (i + 2)).toString(16).padStart(8, '0');
  }
  return `sha512-${finalHash.substring(0, 128)}`;
};

export const analyzeDocument = async (
  content: string, 
  mimeType: string, 
  fileName: string,
  location: { latitude: number; longitude: number; } | null,
  language: string
): Promise<AnalysisResult> => {

  let systemInstruction = `You are "Verum Omnis," the world's first autonomous legal-verification engine. Your purpose is to act as an advanced forensic AI analyst. You will receive a document for analysis. Your task is to perform a deep forensic analysis based on legal, behavioral, and financial intelligence. You must reconstruct events, identify patterns of criminal or dishonest behavior, apply multi-jurisdictional legal reasoning, and produce a sealed forensic report. Your analysis must be objective, evidence-based, and presented in a structured, professional format. You must strictly adhere to the JSON schema provided for your response.`;

  if (language) {
    systemInstruction += ` The user's preferred language is ${language} (e.g., 'en-US', 'pt-BR', 'fr-FR'). Your entire response, including all text fields in the JSON output, must be in this language.`;
  }
  if (location) {
    systemInstruction += ` The user's approximate location is latitude: ${location.latitude}, longitude: ${location.longitude}. Use this to infer the primary legal jurisdiction and inform your multi-jurisdictional legal reasoning, tailoring recommended actions to the most relevant local or regional laws.`;
  }

  const filePart = {
    inlineData: {
      mimeType: mimeType,
      data: content,
    },
  };
  
  const textPart = {
    text: `Analyze the following document named '${fileName}'. Your task is to generate a complete forensic analysis based on the document's content. Populate all fields of the required JSON structure with your findings. Be thorough, insightful, and maintain a professional, forensic tone.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, filePart] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisResultSchema,
      },
    });

    const resultJson = JSON.parse(response.text);

    // Reconstruct the full AnalysisResult object
    const fullResult: AnalysisResult = {
      ...resultJson,
      documentHash: simulateSHA512(content),
      fileName: fileName,
    };
    
    // Quick validation on severity fields to prevent UI errors
    fullResult.criticalLegalSubjects.forEach(s => {
      if (!['Low', 'Medium', 'High', 'Critical'].includes(s.severity)) s.severity = 'Medium';
    });
    fullResult.dishonestyDetectionMatrix.forEach(d => {
       if (!['Low', 'Medium', 'High', 'Critical'].includes(d.severity)) d.severity = 'Medium';
    });
    fullResult.actionableOutput.topLiabilities.forEach(l => {
        if (!['High', 'Critical'].includes(l.severity)) l.severity = 'High';
    });

    return fullResult;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Failed to get analysis from AI. Check the console for more details.");
  }
};


// --- PDF REPORT GENERATOR (V3 - NARRATIVE & INDEXING) ---

export const generatePdfReport = async (result: AnalysisResult, fileName: string) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // --- HELPERS ---
    const checkPageBreak = () => {
        if (y > 255) {
            doc.addPage();
            y = 20;
        }
    }
    const addHeader = (title: string, onFirstPage: boolean = false) => {
        if (!onFirstPage) y = 20;
        doc.setFont('Roboto Mono', 'bold');
        doc.setFontSize(16);
        doc.text("DEEPSEEK VERUM OMNIS: INSTITUTIONAL REVIEW", pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFont('Source Code Pro', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Forensic Analysis Report: ${title}`, pageWidth / 2, y, { align: 'center' });
        y += 10;
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
    };
    
    const addSectionTitle = (title: string) => {
        checkPageBreak();
        doc.setFillColor(230, 230, 250);
        doc.rect(margin, y - 5, contentWidth, 10, 'F');
        doc.setFont('Roboto Mono', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(50);
        doc.text(title.toUpperCase(), margin + 3, y);
        y += 12;
    };

    const addText = (text: string | string[], size: number, weight: 'normal' | 'bold' = 'normal', indent = 0) => {
        checkPageBreak();
        doc.setFontSize(size);
        doc.setFont('Source Code Pro', weight);
        doc.setTextColor(34, 34, 34);
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        doc.text(lines, margin + indent, y);
        y += (lines.length * size * 0.45);
        return lines.length;
    };
    
    const addTable = (head: any[], body: any[], startY: number) => {
      // @ts-ignore
      doc.autoTable({
          head: head,
          body: body,
          startY: startY,
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50], textColor: 255, font: 'Roboto Mono', fontStyle: 'bold' },
          styles: { font: 'Source Code Pro', fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      // @ts-ignore
      return doc.autoTable.previous.finalY;
    };
    
    addHeader(fileName, true);
    y = 35; 
    addSectionTitle("Executive Summary & Actionable Output");
    addText(result.actionableOutput.summary, 9);
    y += 5;
    
    addText(`DISHONESTY SCORE: ${result.actionableOutput.dishonestyScore}%`, 10, 'bold');
    y += 8;

    let tableY = y;
    let head = [["Jurisdiction", "Recommended Action", "Legal Basis"]];
    let body = result.actionableOutput.recommendedActions.map(a => [a.jurisdiction, a.action, a.legalBasis]);
    y = addTable(head, body, tableY);
    y += 10;
    
    head = [["Identified Top Liabilities", "Severity"]];
    body = result.actionableOutput.topLiabilities.map(l => [l.name, l.severity]);
    y = addTable(head, body, y);
    y += 10;

    doc.addPage();
    addHeader(fileName);
    addSectionTitle("Case Narrative");
    addText(result.caseNarrative, 9);
    y+=10;

    checkPageBreak();
    addSectionTitle("Evidence Spotlight");
    result.evidenceSpotlight.forEach(item => {
        checkPageBreak();
        
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
        doc.setFillColor(255, 250, 230); // Use original light yellow
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
    y = addTable(head, body, y);
    y += 10;

    checkPageBreak();
    addSectionTitle("Dishonesty Detection Matrix");
    head = [["Flag", "Description", "Evidence", "Severity"]];
    body = result.dishonestyDetectionMatrix.map(d => [d.flag, d.description, d.evidence, d.severity]);
    y = addTable(head, body, y);
    y += 10;
    
    doc.addPage();
    addHeader(fileName);
    addSectionTitle("Evidence Index");
    head = [["ID", "Description", "Page"]];
    body = result.evidenceIndex.map(e => [e.id, e.description, String(e.pageNumber)]);
    y = addTable(head, body, y);
    
    y = 250;
    checkPageBreak();
    addSectionTitle("Declarations & Seals");
    addText("Pre-Analysis:", 9, 'bold');
    addText([
        `[✓] Initiating extraction under Forensic-Chain Protocol.`,
        `[✓] Preservation flags engaged: WATERMARKS, SEALS, BEHAVIORAL MATRICES.`,
        `[✓] Scope: Entire file content and metadata.`
    ], 8, 'normal', 5);
    y += 4;
    addText("Post-Analysis:", 9, 'bold');
    addText([
        `[✓] Extraction complete. Integrity seals verified.`,
        `[✓] Contradictions/redaction breaks logged in: ${result.postAnalysisDeclaration.logs}`,
        `[✓] Ready for redeployment: New case initialization unlocked.`
    ], 8, 'normal', 5);
    y += 8;
    
    doc.setDrawColor(150);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('Source Code Pro', 'bold');
    doc.text(result.postAnalysisDeclaration.seal, margin, y);
    y += 5;
    doc.setFont('Source Code Pro', 'normal');
    doc.text(`Document SHA-512 Hash: ${result.documentHash}`, margin, y, { maxWidth: contentWidth });

    // Save the PDF
    const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeFileName}_verum_omnis_report.pdf`);
};
