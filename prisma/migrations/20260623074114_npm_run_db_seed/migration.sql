-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'PHYSICIAN', 'NP_PA', 'COORDINATOR', 'MEDICAL_STAFF');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING_REVIEW', 'SCREENING_IN_PROGRESS', 'NOT_ELIGIBLE', 'WORKUP_IN_PROGRESS', 'AWAITING_LABS', 'ASSESSMENT_PENDING', 'ASSESSMENT_COMPLETE', 'PHYSICIAN_REVIEW', 'THERAPY_RECOMMENDED', 'PROCEDURE_SCHEDULED', 'PROCEDURE_COMPLETE', 'DISCHARGED', 'LOST_TO_FOLLOWUP');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('URGENT', 'HIGH', 'ROUTINE');

-- CreateEnum
CREATE TYPE "HtnStage" AS ENUM ('NORMAL', 'ELEVATED', 'STAGE_1', 'STAGE_2', 'HYPERTENSIVE_CRISIS');

-- CreateEnum
CREATE TYPE "ScreeningResult" AS ENUM ('ELIGIBLE_FOR_WORKUP', 'NOT_ELIGIBLE_BP_CONTROLLED', 'NOT_ELIGIBLE_INSUFFICIENT_MEDS', 'WHITE_COAT_HYPERTENSION', 'MASKED_HYPERTENSION', 'NEEDS_AMBULATORY_BP', 'ADHERENCE_ISSUE_FIRST');

-- CreateEnum
CREATE TYPE "WorkupItemStatus" AS ENUM ('NOT_DONE', 'ORDERED', 'PENDING_RESULT', 'COMPLETED_NORMAL', 'COMPLETED_ABNORMAL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "WorkupCompletionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AWAITING_RESULTS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "BpReadingType" AS ENUM ('OFFICE', 'HOME', 'AMBULATORY_DAYTIME', 'AMBULATORY_NIGHTTIME', 'AMBULATORY_24H_AVG');

-- CreateEnum
CREATE TYPE "Arm" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('SITTING', 'STANDING', 'SUPINE');

-- CreateEnum
CREATE TYPE "AntihypertensiveDrugClass" AS ENUM ('ACE_INHIBITOR', 'ARB', 'ARNI', 'CALCIUM_CHANNEL_BLOCKER_DHP', 'CALCIUM_CHANNEL_BLOCKER_NDHP', 'THIAZIDE_DIURETIC', 'THIAZIDE_LIKE_DIURETIC', 'LOOP_DIURETIC', 'POTASSIUM_SPARING_DIURETIC', 'MINERALOCORTICOID_ANTAGONIST', 'BETA_BLOCKER', 'ALPHA_BLOCKER', 'CENTRAL_ALPHA_AGONIST', 'DIRECT_VASODILATOR', 'RENIN_INHIBITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "AdherenceStatus" AS ENUM ('ADHERENT', 'PARTIALLY_ADHERENT', 'NON_ADHERENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LabType" AS ENUM ('SODIUM', 'POTASSIUM', 'CHLORIDE', 'BICARBONATE', 'CREATININE', 'BUN', 'EGFR', 'GLUCOSE', 'CALCIUM', 'MAGNESIUM', 'URIC_ACID', 'TOTAL_CHOLESTEROL', 'LDL_CHOLESTEROL', 'HDL_CHOLESTEROL', 'NON_HDL_CHOLESTEROL', 'TRIGLYCERIDES', 'APOLIPOPROTEIN_B', 'PLASMA_ALDOSTERONE', 'PLASMA_RENIN_ACTIVITY', 'PLASMA_RENIN_DIRECT', 'ALDOSTERONE_RENIN_RATIO', 'PLASMA_METANEPHRINES', 'PLASMA_NORMETANEPHRINES', 'URINE_METANEPHRINES_24H', 'URINE_CATECHOLAMINES_24H', 'URINE_VMA_24H', 'TSH', 'FREE_T4', 'FREE_T3', 'CORTISOL_AM', 'CORTISOL_PM', 'DEXAMETHASONE_SUPPRESSION', 'URINE_FREE_CORTISOL_24H', 'ACTH', 'URINE_MICROALBUMIN', 'URINE_ALBUMIN_CREATININE_RATIO', 'URINE_PROTEIN_CREATININE_RATIO', 'URINE_SODIUM_24H', 'HEMOGLOBIN', 'HEMATOCRIT', 'WBC', 'PLATELETS', 'BNP', 'NT_PROBNP', 'TROPONIN_I', 'TROPONIN_T', 'HBA1C', 'INSULIN_FASTING', 'HOMOCYSTEINE', 'HSCRP');

-- CreateEnum
CREATE TYPE "ImagingType" AS ENUM ('RENAL_DUPLEX_ULTRASOUND', 'CTA_RENAL_ARTERIES', 'MRA_RENAL_ARTERIES', 'RENAL_ANGIOGRAM', 'ECHOCARDIOGRAM_TTE', 'ECHOCARDIOGRAM_TEE', 'CARDIAC_MRI', 'ADRENAL_CT', 'ADRENAL_MRI', 'ABDOMINAL_ULTRASOUND', 'RENAL_ULTRASOUND', 'POLYSOMNOGRAPHY', 'AMBULATORY_BP_MONITOR', 'ECG', 'CHEST_XRAY', 'CT_AORTA', 'FUNDUSCOPIC_EXAM');

-- CreateEnum
CREATE TYPE "Comorbidity" AS ENUM ('DIABETES_TYPE1', 'DIABETES_TYPE2', 'PREDIABETES', 'CHRONIC_KIDNEY_DISEASE', 'END_STAGE_RENAL_DISEASE', 'NEPHROTIC_SYNDROME', 'HEART_FAILURE_PRESERVED_EF', 'HEART_FAILURE_REDUCED_EF', 'CORONARY_ARTERY_DISEASE', 'MYOCARDIAL_INFARCTION_HISTORY', 'ATRIAL_FIBRILLATION', 'STROKE_ISCHEMIC', 'TIA', 'PERIPHERAL_ARTERY_DISEASE', 'AORTIC_ANEURYSM', 'OBSTRUCTIVE_SLEEP_APNEA', 'OBESITY', 'METABOLIC_SYNDROME', 'DYSLIPIDEMIA', 'HYPOTHYROIDISM', 'HYPERTHYROIDISM', 'PRIMARY_ALDOSTERONISM', 'RENOVASCULAR_HYPERTENSION', 'CUSHINGS_SYNDROME', 'PHEOCHROMOCYTOMA', 'PARAGANGLIOMA', 'COARCTATION_OF_AORTA', 'AORTIC_STENOSIS', 'CHRONIC_PAIN_SYNDROME', 'DEPRESSION', 'ANXIETY', 'NSAID_USE_REGULAR', 'ALCOHOL_USE_DISORDER', 'STIMULANT_USE', 'ORAL_CONTRACEPTIVE_USE', 'PREGNANCY_RELATED_HTN', 'AUTOIMMUNE_DISEASE', 'HYPERPARATHYROIDISM');

-- CreateEnum
CREATE TYPE "CvRiskCategory" AS ENUM ('LOW', 'BORDERLINE', 'INTERMEDIATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "TherapyType" AS ENUM ('RENAL_DENERVATION', 'RENAL_ARTERY_STENTING', 'PERCUTANEOUS_TRANSLUMINAL_ANGIOPLASTY', 'BAROREFLEX_ACTIVATION_THERAPY', 'OPTIMAL_MEDICAL_THERAPY_INTENSIFICATION', 'LIFESTYLE_INTERVENTION_PROGRAM', 'SLEEP_APNEA_TREATMENT', 'ENDOCRINOLOGY_REFERRAL', 'NEPHROLOGY_REFERRAL', 'CARDIOLOGY_REFERRAL', 'FURTHER_WORKUP_NEEDED');

-- CreateEnum
CREATE TYPE "RecommendationStrength" AS ENUM ('CLASS_I_A', 'CLASS_I_B', 'CLASS_IIA_A', 'CLASS_IIA_B', 'CLASS_IIB_B', 'CLASS_III_NO_BENEFIT', 'CLASS_III_HARM');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING_PHYSICIAN_REVIEW', 'APPROVED_BY_PHYSICIAN', 'REJECTED_BY_PHYSICIAN', 'MODIFIED_BY_PHYSICIAN', 'PROCEDURE_SCHEDULED', 'PROCEDURE_COMPLETED');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('PENDING_SCHEDULING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED', 'COMPLICATIONS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'ACCESS_DENIED', 'ASSESSMENT_TRIGGERED', 'RECOMMENDATION_APPROVED', 'RECOMMENDATION_REJECTED');

-- CreateEnum
CREATE TYPE "ManagementPhase" AS ENUM ('LIFESTYLE_ONLY', 'MONOTHERAPY', 'DUAL_THERAPY', 'TRIPLE_THERAPY', 'QUADRUPLE_THERAPY', 'INVASIVE_EVALUATION');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'STARTER',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "epicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "epicConfig" JSONB,
    "stripeCustomerId" TEXT,
    "aiAssessmentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bulkImportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "npi" TEXT,
    "specialty" TEXT,
    "title" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "epicPatientId" TEXT,
    "fhirId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "sex" "Sex" NOT NULL,
    "race" TEXT,
    "ethnicity" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" JSONB,
    "insuranceName" TEXT,
    "insuranceId" TEXT,
    "insuranceGroup" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "referralNumber" TEXT,
    "referringProvider" TEXT,
    "referringFacility" TEXT,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "referralNotes" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "createdById" TEXT,
    "assignedToId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralStatusHistory" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "fromStatus" "ReferralStatus",
    "toStatus" "ReferralStatus" NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HtnScreening" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "avgOfficeSbp" DOUBLE PRECISION,
    "avgOfficeDbp" DOUBLE PRECISION,
    "avgHomeSbp" DOUBLE PRECISION,
    "avgHomeDbp" DOUBLE PRECISION,
    "avgAbpmDaySbp" DOUBLE PRECISION,
    "avgAbpmDayDbp" DOUBLE PRECISION,
    "abpmPerformed" BOOLEAN NOT NULL DEFAULT false,
    "htnStage" "HtnStage",
    "medicationCount" INTEGER,
    "onDiureticClass" BOOLEAN,
    "diureticType" TEXT,
    "optimizedDosing" BOOLEAN,
    "adherenceAssessed" BOOLEAN DEFAULT false,
    "adherenceMethod" TEXT,
    "adherenceConfirmed" BOOLEAN,
    "whiteCoatExcluded" BOOLEAN,
    "maskedHtnConsidered" BOOLEAN,
    "obviousSecondaryHtn" BOOLEAN,
    "obviousSecondaryNotes" TEXT,
    "resistantHtn" BOOLEAN,
    "refractoryHtn" BOOLEAN,
    "screeningResult" "ScreeningResult",
    "screeningNotes" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HtnScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HtnWorkup" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "primaryAldosteronism" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "arrResult" DOUBLE PRECISION,
    "arrAbnormal" BOOLEAN,
    "confirmationTesting" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "adrenalImaging" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "adrenalVeinSampling" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "renovascularHtn" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "renalDuplexDone" BOOLEAN NOT NULL DEFAULT false,
    "ctaMraDone" BOOLEAN NOT NULL DEFAULT false,
    "stenosis" DOUBLE PRECISION,
    "stenosisSide" TEXT,
    "renalArteryLength" DOUBLE PRECISION,
    "renalArteryDiameter" DOUBLE PRECISION,
    "accessoryRenalArteries" BOOLEAN,
    "sleepApnea" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "stopsAngScore" INTEGER,
    "ahi" DOUBLE PRECISION,
    "cpapInitiated" BOOLEAN,
    "renalParenchymal" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "ckdStage" TEXT,
    "proteinuria" BOOLEAN,
    "thyroidDisease" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "cushings" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "overnightDexResult" DOUBLE PRECISION,
    "pheochromocytoma" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "metanephrinesElevated" BOOLEAN,
    "coarctationAorta" "WorkupItemStatus" NOT NULL DEFAULT 'NOT_DONE',
    "drugInducedReviewed" BOOLEAN NOT NULL DEFAULT false,
    "offendingAgentsIdentified" TEXT,
    "ecgDone" BOOLEAN NOT NULL DEFAULT false,
    "ecgLvh" BOOLEAN,
    "echocardiogramDone" BOOLEAN NOT NULL DEFAULT false,
    "echoLvh" BOOLEAN,
    "echoLvmi" DOUBLE PRECISION,
    "echoEf" DOUBLE PRECISION,
    "echoDiastolicDysfunction" BOOLEAN,
    "funduscopicDone" BOOLEAN NOT NULL DEFAULT false,
    "hypertensiveRetinopathy" BOOLEAN,
    "retinopathyGrade" INTEGER,
    "microalbuminuriaDone" BOOLEAN NOT NULL DEFAULT false,
    "albuminuriaMgG" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "waistCircumferenceCm" DOUBLE PRECISION,
    "dietaryNaclGDay" DOUBLE PRECISION,
    "dashDietAdherence" TEXT,
    "alcoholDrinksPerWeek" INTEGER,
    "smokingStatus" TEXT,
    "physicalActivityMinWk" INTEGER,
    "workupStatus" "WorkupCompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "workupNotes" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HtnWorkup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "readingDate" TIMESTAMP(3) NOT NULL,
    "readingType" "BpReadingType" NOT NULL,
    "sbp" INTEGER NOT NULL,
    "dbp" INTEGER NOT NULL,
    "heartRate" INTEGER,
    "arm" "Arm",
    "position" "Position" DEFAULT 'SITTING',
    "device" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "fhirId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BpReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMedication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandName" TEXT,
    "drugClass" "AntihypertensiveDrugClass",
    "doseValue" DOUBLE PRECISION,
    "doseUnit" TEXT,
    "frequency" TEXT NOT NULL,
    "route" TEXT DEFAULT 'oral',
    "maxDose" DOUBLE PRECISION,
    "isAtMaxDose" BOOLEAN,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "adherence" "AdherenceStatus",
    "reasonStopped" TEXT,
    "prescribedById" TEXT,
    "notes" TEXT,
    "fhirId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "labDate" TIMESTAMP(3) NOT NULL,
    "labType" "LabType" NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "unit" TEXT,
    "referenceRangeLow" DOUBLE PRECISION,
    "referenceRangeHigh" DOUBLE PRECISION,
    "isAbnormal" BOOLEAN,
    "isCritical" BOOLEAN DEFAULT false,
    "rawValue" TEXT,
    "notes" TEXT,
    "orderedById" TEXT,
    "performingLab" TEXT,
    "fhirId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingStudy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "studyDate" TIMESTAMP(3) NOT NULL,
    "studyType" "ImagingType" NOT NULL,
    "indication" TEXT,
    "findings" TEXT,
    "impression" TEXT,
    "performingFacility" TEXT,
    "renalArteryPatentLeft" BOOLEAN,
    "renalArteryPatentRight" BOOLEAN,
    "stenosisPercentLeft" DOUBLE PRECISION,
    "stenosisPercentRight" DOUBLE PRECISION,
    "renalArteryLengthLeft" DOUBLE PRECISION,
    "renalArteryLengthRight" DOUBLE PRECISION,
    "renalArteryDiamLeft" DOUBLE PRECISION,
    "renalArteryDiamRight" DOUBLE PRECISION,
    "accessoryArteriesLeft" INTEGER,
    "accessoryArteriesRight" INTEGER,
    "lvEjectionFraction" DOUBLE PRECISION,
    "lvMassIndex" DOUBLE PRECISION,
    "orderedById" TEXT,
    "reportedById" TEXT,
    "fhirId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientComorbidity" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" "Comorbidity" NOT NULL,
    "icdCode" TEXT,
    "severity" TEXT,
    "diagnosedDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "controlledWith" TEXT,
    "notes" TEXT,
    "fhirId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientComorbidity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAssessment" (
    "id" TEXT NOT NULL,
    "workupId" TEXT NOT NULL,
    "guidelineSetId" TEXT NOT NULL,
    "guidelineVersion" TEXT NOT NULL,
    "htnStage" "HtnStage",
    "resistantHtnConfirmed" BOOLEAN,
    "refractoryHtnConfirmed" BOOLEAN,
    "pseudoresistanceExcluded" BOOLEAN,
    "secondaryCausesIdentified" JSONB,
    "secondaryCausesRequireWorkup" JSONB,
    "cvRiskCategory" "CvRiskCategory",
    "ascvd10YearRisk" DOUBLE PRECISION,
    "ascvdCalculationData" JSONB,
    "highRiskConditions" JSONB,
    "bpTargetSbp" INTEGER,
    "bpTargetDbp" INTEGER,
    "bpTargetRationale" TEXT,
    "currentBpControlled" BOOLEAN,
    "managementPhase" "ManagementPhase",
    "lifestyleRecommendations" JSONB,
    "medicationGaps" JSONB,
    "medicationOptimizations" JSONB,
    "rdnEligible" BOOLEAN,
    "rdnEligibilityDetails" JSONB,
    "stentingEligible" BOOLEAN,
    "stentingEligibilityDetails" JSONB,
    "ptaEligible" BOOLEAN,
    "ptaEligibilityDetails" JSONB,
    "clinicalSummary" TEXT,
    "keyFindings" JSONB,
    "recommendations" JSONB,
    "urgencyFlags" JSONB,
    "guidelinesUsed" JSONB,
    "guidelineConflicts" JSONB,
    "aiModel" TEXT,
    "aiTokensUsed" INTEGER,
    "confidenceScore" DOUBLE PRECISION,
    "processingTimeMs" INTEGER,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "physicianAgrees" BOOLEAN,
    "physicianNotes" TEXT,
    "physicianModifications" JSONB,

    CONSTRAINT "ClinicalAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TherapyRecommendation" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "therapyType" "TherapyType" NOT NULL,
    "recommendation" "RecommendationStrength" NOT NULL,
    "indication" TEXT NOT NULL,
    "contraindications" JSONB,
    "prerequisites" JSONB,
    "guidelineRefs" JSONB,
    "procedureDetails" JSONB,
    "notes" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING_PHYSICIAN_REVIEW',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "physicianNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "tenantId" TEXT,
    "phase" "ManagementPhase" NOT NULL,
    "bpTargetSbp" INTEGER NOT NULL,
    "bpTargetDbp" INTEGER NOT NULL,
    "lifestylePlan" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "medicationPlan" JSONB NOT NULL,
    "bpCheckIntervalWeeks" INTEGER,
    "labMonitoringPlan" JSONB,
    "nextReviewDate" TIMESTAMP(3),
    "goalsAchieved" BOOLEAN NOT NULL DEFAULT false,
    "notesForPatient" TEXT,
    "notesForClinician" TEXT,
    "guidelineVersion" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureType" "TherapyType" NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "performedDate" TIMESTAMP(3),
    "status" "ProcedureStatus" NOT NULL DEFAULT 'PENDING_SCHEDULING',
    "operatingPhysician" TEXT,
    "assistingStaff" TEXT,
    "facility" TEXT,
    "cathLabRoom" TEXT,
    "consentObtained" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "prepInstructions" JSONB,
    "holdMedications" JSONB,
    "renalFunctionPreProc" DOUBLE PRECISION,
    "accessSite" TEXT,
    "sheathSize" TEXT,
    "contrastTypeVolumeMl" DOUBLE PRECISION,
    "fluoroscopyTimeMin" DOUBLE PRECISION,
    "radiationDoseGy" DOUBLE PRECISION,
    "complications" TEXT,
    "rdnSystem" TEXT,
    "rdnApproach" TEXT,
    "rdnCatheterSizeLeft" TEXT,
    "rdnCatheterSizeRight" TEXT,
    "rdnLesionsLeft" INTEGER,
    "rdnLesionsRight" INTEGER,
    "rdnImpedanceData" JSONB,
    "treatmentSide" TEXT,
    "preDilatation" BOOLEAN,
    "stentType" TEXT,
    "stentSizeDiamMm" DOUBLE PRECISION,
    "stentSizeLengthMm" DOUBLE PRECISION,
    "postDilatation" BOOLEAN,
    "residualStenosis" DOUBLE PRECISION,
    "finalAngiogramResult" TEXT,
    "postProcedureBpReadings" JSONB,
    "dischargeBpSbp" INTEGER,
    "dischargeBpDbp" INTEGER,
    "dischargeNotes" TEXT,
    "followUpPlan" JSONB,
    "nextBpCheckDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidelineVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "changeNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "engineVersion" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidelineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_refreshToken_idx" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_epicPatientId_idx" ON "Patient"("epicPatientId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_tenantId_mrn_key" ON "Patient"("tenantId", "mrn");

-- CreateIndex
CREATE INDEX "Referral_tenantId_idx" ON "Referral"("tenantId");

-- CreateIndex
CREATE INDEX "Referral_patientId_idx" ON "Referral"("patientId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_tenantId_status_idx" ON "Referral"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReferralStatusHistory_referralId_idx" ON "ReferralStatusHistory"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "HtnScreening_referralId_key" ON "HtnScreening"("referralId");

-- CreateIndex
CREATE UNIQUE INDEX "HtnWorkup_referralId_key" ON "HtnWorkup"("referralId");

-- CreateIndex
CREATE INDEX "BpReading_patientId_readingDate_idx" ON "BpReading"("patientId", "readingDate");

-- CreateIndex
CREATE INDEX "BpReading_patientId_readingType_idx" ON "BpReading"("patientId", "readingType");

-- CreateIndex
CREATE INDEX "PatientMedication_patientId_isActive_idx" ON "PatientMedication"("patientId", "isActive");

-- CreateIndex
CREATE INDEX "PatientMedication_patientId_drugClass_idx" ON "PatientMedication"("patientId", "drugClass");

-- CreateIndex
CREATE INDEX "LabResult_patientId_labType_labDate_idx" ON "LabResult"("patientId", "labType", "labDate");

-- CreateIndex
CREATE INDEX "ImagingStudy_patientId_studyType_idx" ON "ImagingStudy"("patientId", "studyType");

-- CreateIndex
CREATE INDEX "PatientComorbidity_patientId_isActive_idx" ON "PatientComorbidity"("patientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PatientComorbidity_patientId_condition_key" ON "PatientComorbidity"("patientId", "condition");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalAssessment_workupId_key" ON "ClinicalAssessment"("workupId");

-- CreateIndex
CREATE INDEX "ClinicalAssessment_assessedAt_idx" ON "ClinicalAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "TherapyRecommendation_assessmentId_idx" ON "TherapyRecommendation"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementPlan_assessmentId_key" ON "ManagementPlan"("assessmentId");

-- CreateIndex
CREATE INDEX "ManagementPlan_patientId_idx" ON "ManagementPlan"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_recommendationId_key" ON "Procedure"("recommendationId");

-- CreateIndex
CREATE INDEX "Procedure_tenantId_scheduledDate_idx" ON "Procedure"("tenantId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Procedure_patientId_idx" ON "Procedure"("patientId");

-- CreateIndex
CREATE INDEX "Procedure_status_idx" ON "Procedure"("status");

-- CreateIndex
CREATE INDEX "GuidelineVersion_isActive_idx" ON "GuidelineVersion"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GuidelineVersion_society_year_version_key" ON "GuidelineVersion"("society", "year", "version");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStatusHistory" ADD CONSTRAINT "ReferralStatusHistory_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HtnScreening" ADD CONSTRAINT "HtnScreening_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HtnWorkup" ADD CONSTRAINT "HtnWorkup_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpReading" ADD CONSTRAINT "BpReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingStudy" ADD CONSTRAINT "ImagingStudy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientComorbidity" ADD CONSTRAINT "PatientComorbidity_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAssessment" ADD CONSTRAINT "ClinicalAssessment_workupId_fkey" FOREIGN KEY ("workupId") REFERENCES "HtnWorkup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyRecommendation" ADD CONSTRAINT "TherapyRecommendation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ClinicalAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementPlan" ADD CONSTRAINT "ManagementPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementPlan" ADD CONSTRAINT "ManagementPlan_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ClinicalAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "TherapyRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
