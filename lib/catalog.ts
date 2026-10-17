// Fictional catalog. Every dropdown uses these values — no free text for company/role/level/city.
// Stored on Arkiv as the `id` strings, displayed via the `label`.

export interface CatalogItem {
  id: string;
  label: string;
}

export interface Company extends CatalogItem {
  industry: string;
  hq: string; // city id
  /** Pay tier multiplier used by the seed generator only. */
  tier: number;
}

export const COMPANIES: Company[] = [
  { id: "nimbus-infotech", label: "Nimbus Infotech", industry: "IT services", hq: "hyderabad", tier: 0.8 },
  { id: "kaveri-systems", label: "Kaveri Systems", industry: "Product SaaS", hq: "bengaluru", tier: 1.25 },
  { id: "godavari-labs", label: "Godavari Labs", industry: "AI/ML", hq: "hyderabad", tier: 1.35 },
  { id: "deccan-cloudworks", label: "Deccan Cloudworks", industry: "Cloud infra", hq: "pune", tier: 1.1 },
  { id: "sahyadri-software", label: "Sahyadri Software", industry: "Fintech", hq: "mumbai", tier: 1.2 },
  { id: "tungabhadra-tech", label: "Tungabhadra Tech", industry: "IT services", hq: "chennai", tier: 0.75 },
  { id: "vindhya-analytics", label: "Vindhya Analytics", industry: "Data/analytics", hq: "gurugram", tier: 1.0 },
  { id: "coromandel-digital", label: "Coromandel Digital", industry: "E-commerce", hq: "coimbatore", tier: 0.95 },
];

export const ROLES: CatalogItem[] = [
  { id: "software-engineer", label: "Software Engineer" },
  { id: "frontend-engineer", label: "Frontend Engineer" },
  { id: "backend-engineer", label: "Backend Engineer" },
  { id: "data-scientist", label: "Data Scientist" },
  { id: "data-analyst", label: "Data Analyst" },
  { id: "qa-engineer", label: "QA Engineer" },
  { id: "devops-engineer", label: "DevOps Engineer" },
  { id: "product-manager", label: "Product Manager" },
  { id: "product-designer", label: "Product Designer" },
];

export const LEVELS: CatalogItem[] = [
  { id: "intern", label: "Intern" },
  { id: "sde-1", label: "L1 / SDE-1" },
  { id: "sde-2", label: "L2 / SDE-2" },
  { id: "senior", label: "L3 / Senior" },
  { id: "staff", label: "L4 / Staff" },
  { id: "lead", label: "Lead / Manager" },
];

export const CITIES: CatalogItem[] = [
  { id: "hyderabad", label: "Hyderabad" },
  { id: "bengaluru", label: "Bengaluru" },
  { id: "chennai", label: "Chennai" },
  { id: "pune", label: "Pune" },
  { id: "mumbai", label: "Mumbai" },
  { id: "gurugram", label: "Gurugram" },
  { id: "noida", label: "Noida" },
  { id: "coimbatore", label: "Coimbatore" },
  { id: "kochi", label: "Kochi" },
  { id: "remote", label: "Remote" },
];

const index = <T extends CatalogItem>(items: T[]) => new Map(items.map((i) => [i.id, i]));
const companyIndex = index(COMPANIES);
const roleIndex = index(ROLES);
const levelIndex = index(LEVELS);
const cityIndex = index(CITIES);

export const getCompany = (id: string) => companyIndex.get(id);
export const companyName = (id: string) => companyIndex.get(id)?.label ?? id;
export const roleLabel = (id: string) => roleIndex.get(id)?.label ?? id;
export const levelLabel = (id: string) => levelIndex.get(id)?.label ?? id;
export const cityLabel = (id: string) => cityIndex.get(id)?.label ?? id;

export const isCompany = (id: string) => companyIndex.has(id);
export const isRole = (id: string) => roleIndex.has(id);
export const isLevel = (id: string) => levelIndex.has(id);
export const isCity = (id: string) => cityIndex.has(id);
