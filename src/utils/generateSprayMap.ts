import jsPDF from "jspdf";

interface Treatment {
  chemical: string
  dosage: string
  applicationMethod: string
  frequency: string
}

interface ScanResult {
  cropType: string
  disease: string | null
  severity: string
  confidence: number
  affectedAreaPercent: number
  spreadRisk: string
  treatment?: Treatment
  organicAlternative?: string
  preventionTips?: string[]
  urgency: string
}

export const generateSprayMapPDF = (
  result: ScanResult,
  fieldName: string | undefined,
  farmerName: string | undefined
) => {
  const doc = new jsPDF()
  const today = new Date().toLocaleDateString("en-IN")

  // Header
  doc.setFillColor(22, 163, 74)
  doc.rect(0, 0, 210, 30, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("AgroShield AI — Spray Plan", 15, 18)
  doc.setFontSize(10)
  doc.text(`Generated: ${today}`, 150, 18)

  // Farmer & Field Info
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("FIELD INFORMATION", 15, 45)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(`Farmer: ${farmerName || "N/A"}`, 15, 55)
  doc.text(`Field: ${fieldName || "N/A"}`, 15, 63)
  doc.text(`Crop: ${result.cropType}`, 15, 71)

  // Disease Detection
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(220, 38, 38)
  doc.text("DISEASE DETECTED", 15, 88)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(`Disease: ${result.disease || "None"}`, 15, 98)
  doc.text(`Severity: ${result.severity?.toUpperCase()}`, 15, 106)
  doc.text(`Affected Area: ${result.affectedAreaPercent}% of scanned zone`, 15, 114)
  doc.text(`AI Confidence: ${result.confidence}%`, 15, 122)
  doc.text(`Spread Risk: ${result.spreadRisk?.toUpperCase()}`, 15, 130)

  // Treatment Box
  doc.setFillColor(240, 253, 244)
  doc.rect(10, 140, 190, 55, "F")
  doc.setDrawColor(22, 163, 74)
  doc.rect(10, 140, 190, 55, "S")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(22, 163, 74)
  doc.text("RECOMMENDED TREATMENT", 15, 152)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(`Chemical: ${result.treatment?.chemical || "None required"}`, 15, 162)
  doc.text(`Dosage: ${result.treatment?.dosage || "N/A"}`, 15, 170)
  doc.text(`Method: ${result.treatment?.applicationMethod || "N/A"}`, 15, 178)
  doc.text(`Frequency: ${result.treatment?.frequency || "N/A"}`, 15, 186)

  // Organic Alternative
  if (result.organicAlternative) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    doc.setTextColor(22, 163, 74)
    doc.text(`Organic Alternative: ${result.organicAlternative}`, 15, 200)
  }

  // Prevention Tips
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("PREVENTION TIPS", 15, 215)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const tips = result.preventionTips || []
  tips.forEach((tip: string, i: number) => {
    doc.text(`${i + 1}. ${tip}`, 15, 225 + (i * 8))
  })

  // Urgency Footer
  doc.setFillColor(254, 249, 195)
  doc.rect(10, 265, 190, 18, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(161, 98, 7)
  doc.text(`ACTION REQUIRED: ${result.urgency?.replace(/_/g, " ")?.toUpperCase()}`, 15, 277)

  // Disclaimer
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    "This spray plan is AI-generated. Follow ICAR guidelines. " +
    "Consult an agricultural officer for confirmation.",
    15, 290
  )

  doc.save(`AgroShield_SprayPlan_${fieldName || 'Field'}_${today}.pdf`)
}