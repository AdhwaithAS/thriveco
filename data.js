/**
 * THRIVE&CO - Healthcare Resource Management System
 * Mock Seed Data & Initial Collections
 * Marian College of Engineering - Academic Project 2026-2027
 * Team: Nidha Nafeer, Harinandana K, Asher Satyadas, Suryanarayanan SD
 */

const SEED_DATA = {
  facilities: [
    {
      facilityId: "FAC001",
      facilityName: "Marian Medical Center",
      facilityType: "Hospital",
      address: "Kazhakkoottam, Thiruvananthapuram, Kerala 695582",
      contactDetails: {
        phone: "+91 471 271 2345",
        emergencyPhone: "+91 471 271 9999",
        email: "emergency@marianmedical.org",
        coordinator: "Dr. K. Thomas (Medical Supt.)"
      },
      verified: true,
      lastAudit: "2026-10-10"
    },
    {
      facilityId: "FAC002",
      facilityName: "St. Joseph's Specialty Hospital",
      facilityType: "Hospital",
      address: "Pattom, Thiruvananthapuram, Kerala 695004",
      contactDetails: {
        phone: "+91 471 244 5566",
        emergencyPhone: "+91 471 244 9999",
        email: "resources@stjosephshospital.org",
        coordinator: "Sister Regina (Chief Pharmacist)"
      },
      verified: true,
      lastAudit: "2026-10-09"
    },
    {
      facilityId: "FAC003",
      facilityName: "City Central Pharmacy",
      facilityType: "Pharmacy",
      address: "MG Road, Overbridge Junction, Thiruvananthapuram, Kerala 695001",
      contactDetails: {
        phone: "+91 471 233 4455",
        emergencyPhone: "+91 471 233 4456",
        email: "dispensary@citycentralpharma.com",
        coordinator: "Anil Kumar (Licensed Chemist)"
      },
      verified: true,
      lastAudit: "2026-10-11"
    },
    {
      facilityId: "FAC004",
      facilityName: "Apex Care Meds & Surgicals",
      facilityType: "Pharmacy",
      address: "Technopark Phase 1 Bypass, Thiruvananthapuram, Kerala 695581",
      contactDetails: {
        phone: "+91 471 270 0112",
        emergencyPhone: "+91 471 270 0113",
        email: "orders@apexcaremeds.com",
        coordinator: "Divya Nair (Lead Pharmacist)"
      },
      verified: true,
      lastAudit: "2026-10-08"
    },
    {
      facilityId: "FAC005",
      facilityName: "Kerala Regional Blood Bank & Transfusion Centre",
      facilityType: "Blood Bank",
      address: "Medical College PO, Thiruvananthapuram, Kerala 695011",
      contactDetails: {
        phone: "+91 471 252 8383",
        emergencyPhone: "+91 471 252 9900",
        email: "bloodbank@keralatransfusion.gov.in",
        coordinator: "Dr. Deepa Pillai (Transfusion Officer)"
      },
      verified: true,
      lastAudit: "2026-10-11"
    },
    {
      facilityId: "FAC006",
      facilityName: "Red Cross Community Blood Center",
      facilityType: "Blood Bank",
      address: "Vanchiyoor, Thiruvananthapuram, Kerala 695035",
      contactDetails: {
        phone: "+91 471 247 1200",
        emergencyPhone: "+91 471 247 1201",
        email: "redcross.tvm@redcrosskerala.org",
        coordinator: "Ramesh Chandran (Officer-in-charge)"
      },
      verified: true,
      lastAudit: "2026-10-11"
    }
  ],

  medicines: [
    {
      medicineId: "MED001",
      facilityId: "FAC001",
      medicineName: "Adrenaline 1mg/ml Injection",
      category: "Emergency & Critical Care",
      quantity: 12,
      unit: "Ampoules",
      reorderLevel: 25,
      batchNumber: "ADR-26B09",
      expiryDate: "2027-08-15",
      lastUpdated: "2026-10-11 18:30"
    },
    {
      medicineId: "MED002",
      facilityId: "FAC001",
      medicineName: "Atropine Sulphate 0.6mg/ml",
      category: "Emergency & Resuscitation",
      quantity: 85,
      unit: "Ampoules",
      reorderLevel: 30,
      batchNumber: "ATR-26A44",
      expiryDate: "2027-11-20",
      lastUpdated: "2026-10-11 14:15"
    },
    {
      medicineId: "MED003",
      facilityId: "FAC003",
      medicineName: "Amoxicillin & Clavulanate 625mg",
      category: "Antibiotics",
      quantity: 480,
      unit: "Tablets",
      reorderLevel: 100,
      batchNumber: "AMC-26J12",
      expiryDate: "2028-02-10",
      lastUpdated: "2026-10-10 11:20"
    },
    {
      medicineId: "MED004",
      facilityId: "FAC001",
      medicineName: "Paracetamol IV Infusion 100ml",
      category: "Analgesic & Antipyretic",
      quantity: 18,
      unit: "Bottles",
      reorderLevel: 50,
      batchNumber: "PCM-26E05",
      expiryDate: "2027-06-30",
      lastUpdated: "2026-10-11 16:45"
    },
    {
      medicineId: "MED005",
      facilityId: "FAC003",
      medicineName: "Human Actrapid Insulin 100 IU/ml",
      category: "Endocrinology",
      quantity: 8,
      unit: "Vials",
      reorderLevel: 20,
      batchNumber: "INS-26F88",
      expiryDate: "2027-04-12",
      lastUpdated: "2026-10-11 19:10"
    },
    {
      medicineId: "MED006",
      facilityId: "FAC002",
      medicineName: "Heparin Sodium 5000 IU/ml",
      category: "Anticoagulants",
      quantity: 34,
      unit: "Vials",
      reorderLevel: 25,
      batchNumber: "HEP-26H31",
      expiryDate: "2027-09-01",
      lastUpdated: "2026-10-11 12:00"
    },
    {
      medicineId: "MED007",
      facilityId: "FAC002",
      medicineName: "Meropenem 1g IV Injection",
      category: "Reserve Antibiotics",
      quantity: 6,
      unit: "Vials",
      reorderLevel: 15,
      batchNumber: "MRP-26K02",
      expiryDate: "2027-10-25",
      lastUpdated: "2026-10-11 17:05"
    },
    {
      medicineId: "MED008",
      facilityId: "FAC004",
      medicineName: "Hydrocortisone 100mg Injection",
      category: "Corticosteroids",
      quantity: 92,
      unit: "Vials",
      reorderLevel: 30,
      batchNumber: "HYD-26C77",
      expiryDate: "2028-01-15",
      lastUpdated: "2026-10-09 09:40"
    },
    {
      medicineId: "MED009",
      facilityId: "FAC001",
      medicineName: "Normal Saline (0.9% NaCl) 500ml",
      category: "Intravenous Fluids",
      quantity: 310,
      unit: "Bottles",
      reorderLevel: 80,
      batchNumber: "NS-26D19",
      expiryDate: "2028-05-30",
      lastUpdated: "2026-10-11 08:30"
    },
    {
      medicineId: "MED010",
      facilityId: "FAC002",
      medicineName: "Ringer's Lactate Solution 500ml",
      category: "Intravenous Fluids",
      quantity: 215,
      unit: "Bottles",
      reorderLevel: 60,
      batchNumber: "RL-26G14",
      expiryDate: "2028-04-18",
      lastUpdated: "2026-10-10 15:20"
    },
    {
      medicineId: "MED011",
      facilityId: "FAC002",
      medicineName: "Amiodarone 150mg/3ml Injection",
      category: "Antiarrhythmic / Cardiac",
      quantity: 11,
      unit: "Ampoules",
      reorderLevel: 20,
      batchNumber: "AMD-26L03",
      expiryDate: "2027-07-22",
      lastUpdated: "2026-10-11 19:40"
    },
    {
      medicineId: "MED012",
      facilityId: "FAC004",
      medicineName: "Azithromycin 500mg Tablets",
      category: "Antibiotics",
      quantity: 260,
      unit: "Strips",
      reorderLevel: 50,
      batchNumber: "AZI-26M90",
      expiryDate: "2028-03-14",
      lastUpdated: "2026-10-08 16:15"
    }
  ],

  bloodStock: [
    {
      recordId: "BLD001",
      facilityId: "FAC005",
      bloodGroup: "O+",
      component: "Whole Blood",
      quantity: 24,
      availabilityStatus: "Available",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 19:30"
    },
    {
      recordId: "BLD002",
      facilityId: "FAC005",
      bloodGroup: "O-",
      component: "Packed Red Blood Cells (PRBC)",
      quantity: 4,
      availabilityStatus: "Critical Alert",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 20:00"
    },
    {
      recordId: "BLD003",
      facilityId: "FAC005",
      bloodGroup: "A+",
      component: "Whole Blood",
      quantity: 19,
      availabilityStatus: "Available",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 17:45"
    },
    {
      recordId: "BLD004",
      facilityId: "FAC005",
      bloodGroup: "A-",
      component: "Packed Red Blood Cells (PRBC)",
      quantity: 3,
      availabilityStatus: "Low Stock",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 18:15"
    },
    {
      recordId: "BLD005",
      facilityId: "FAC005",
      bloodGroup: "B+",
      component: "Whole Blood",
      quantity: 28,
      availabilityStatus: "Available",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 19:10"
    },
    {
      recordId: "BLD006",
      facilityId: "FAC005",
      bloodGroup: "B-",
      component: "Fresh Frozen Plasma (FFP)",
      quantity: 5,
      availabilityStatus: "Low Stock",
      storageTemp: "-25°C",
      lastUpdated: "2026-10-11 16:20"
    },
    {
      recordId: "BLD007",
      facilityId: "FAC005",
      bloodGroup: "AB+",
      component: "Platelet Concentrate (RDP)",
      quantity: 14,
      availabilityStatus: "Available",
      storageTemp: "20°C - 24°C (Agitated)",
      lastUpdated: "2026-10-11 18:50"
    },
    {
      recordId: "BLD008",
      facilityId: "FAC005",
      bloodGroup: "AB-",
      component: "Packed Red Blood Cells (PRBC)",
      quantity: 2,
      availabilityStatus: "Critical Alert",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 19:55"
    },
    {
      recordId: "BLD009",
      facilityId: "FAC006",
      bloodGroup: "O+",
      component: "Whole Blood",
      quantity: 16,
      availabilityStatus: "Available",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 15:40"
    },
    {
      recordId: "BLD010",
      facilityId: "FAC006",
      bloodGroup: "O-",
      component: "Whole Blood",
      quantity: 2,
      availabilityStatus: "Critical Alert",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 17:10"
    },
    {
      recordId: "BLD011",
      facilityId: "FAC001",
      bloodGroup: "B+",
      component: "Packed Red Blood Cells (PRBC)",
      quantity: 9,
      availabilityStatus: "Available",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 14:30"
    },
    {
      recordId: "BLD012",
      facilityId: "FAC002",
      bloodGroup: "A+",
      component: "Packed Red Blood Cells (PRBC)",
      quantity: 11,
      availabilityStatus: "Available",
      storageTemp: "2°C - 6°C",
      lastUpdated: "2026-10-11 16:15"
    }
  ],

  hospitalResources: [
    {
      resourceId: "RES001",
      facilityId: "FAC001",
      resourceName: "ICU Ventilator Beds",
      category: "Intensive Care Beds",
      totalCapacity: 24,
      availableQuantity: 3,
      reorderLevel: 5,
      unit: "Beds",
      lastUpdated: "2026-10-11 19:45"
    },
    {
      resourceId: "RES002",
      facilityId: "FAC001",
      resourceName: "Medical Oxygen Cylinders (Type D / 47L)",
      category: "Gas & Respiratory",
      totalCapacity: 120,
      availableQuantity: 42,
      reorderLevel: 25,
      unit: "Cylinders",
      lastUpdated: "2026-10-11 18:20"
    },
    {
      resourceId: "RES003",
      facilityId: "FAC001",
      resourceName: "Emergency Multipara Cardiac Monitors",
      category: "Diagnostic & Monitoring",
      totalCapacity: 35,
      availableQuantity: 8,
      reorderLevel: 6,
      unit: "Units",
      lastUpdated: "2026-10-11 17:30"
    },
    {
      resourceId: "RES004",
      facilityId: "FAC002",
      resourceName: "Adult ICU Ventilator Units",
      category: "Critical Equipment",
      totalCapacity: 18,
      availableQuantity: 2,
      reorderLevel: 4,
      unit: "Units",
      lastUpdated: "2026-10-11 20:10"
    },
    {
      resourceId: "RES005",
      facilityId: "FAC002",
      resourceName: "Emergency Resuscitation Crash Carts",
      category: "Emergency Care",
      totalCapacity: 15,
      availableQuantity: 11,
      reorderLevel: 3,
      unit: "Carts",
      lastUpdated: "2026-10-11 16:00"
    },
    {
      resourceId: "RES006",
      facilityId: "FAC002",
      resourceName: "Pediatric Isolation Beds",
      category: "Wards & Isolation",
      totalCapacity: 30,
      availableQuantity: 14,
      reorderLevel: 8,
      unit: "Beds",
      lastUpdated: "2026-10-11 15:45"
    }
  ],

  users: [
    {
      userId: "USR001",
      name: "Dr. Nidha Nafeer",
      email: "nidha@thrive.marian.ac.in",
      role: "Hospital Staff",
      facilityId: "FAC001"
    },
    {
      userId: "USR002",
      name: "Harinandana K",
      email: "harinandana@thrive.marian.ac.in",
      role: "Pharmacy Staff",
      facilityId: "FAC003"
    },
    {
      userId: "USR003",
      name: "Asher Satyadas",
      email: "asher@thrive.marian.ac.in",
      role: "Blood Bank Officer",
      facilityId: "FAC005"
    },
    {
      userId: "USR004",
      name: "Suryanarayanan SD",
      email: "surya@thrive.marian.ac.in",
      role: "System Admin",
      facilityId: "FAC001"
    },
    {
      userId: "USR005",
      name: "Emergency Dispatch Desk",
      email: "dispatch@keralapolice-health.gov.in",
      role: "Emergency Search User",
      facilityId: "FAC001"
    }
  ]
};
