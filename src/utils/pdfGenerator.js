import { jsPDF } from "jspdf";

export const generateAdmissionReceipt = (appData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // --- Theme Colors ---
  const primaryColor = "#00BFFF";
  const darkColor = "#0B1120";

  // --- Header Border Accent ---
  doc.setFillColor(11, 17, 32); // #0B1120
  doc.rect(0, 0, 210, 40, "F");

  // --- University Branding Title ---
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text("TEZPUR UNIVERSITY", 105, 18, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Online Admission & Counselling System (OACS TU)", 105, 26, { align: "center" });

  // --- Document Subtitle ---
  doc.setTextColor(11, 17, 32);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COUNSELLING ACKNOWLEDGEMENT & PROVISIONAL RECEIPT", 20, 55);

  // --- Horizontal Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, 60, 190, 60);

  // --- Grid Data Layout Configuration ---
  doc.setFontSize(11);
  
  const fields = [
    { label: "Application Number:", value: appData.applicationId },
    { label: "Candidate Name:", value: appData.studentName },
    { label: "Contact Phone:", value: appData.phone },
    { label: "Selected Department:", value: appData.department },
    { label: "Allocated Programme:", value: appData.programme },
    { label: "Reservation Category:", value: appData.category },
    { label: "Merit Index Percentage:", value: `${appData.academicPercentage}%` },
    { label: "Fee Payment Status:", value: appData.paymentStatus.toUpperCase() },
    { label: "Admission Clearance:", value: appData.status.toUpperCase() },
  ];

  let currentY = 72;
  
  fields.forEach((field) => {
    // Label
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(field.label, 20, currentY);

    // Value
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(String(field.value), 75, currentY);

    currentY += 10;
  });

  // --- Decorative Border Box around Data ---
  doc.setDrawColor(220, 220, 220);
  doc.rect(15, 45, 180, 115);

  // --- Verification Footer Disclaimer ---
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Note: This is a system-generated provisional acknowledgement document based on data locked at matching metrics.",
    20,
    175
  );
  doc.text(
    `Generation Timestamp: ${new Date().toLocaleString()} | Secure Verification Hash: Firestore-Sync`,
    20,
    180
  );

  // --- Save File Action Trigger ---
  doc.save(`TU_Admission_Receipt_${appData.applicationId}.pdf`);
};