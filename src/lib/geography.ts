export interface GeographicFocus {
  countries: string[];
  states: string[];
  regions: string[];
}

export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "GLOBAL", name: "Global / International" },
] as const;

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "PR", name: "Puerto Rico" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "VI", name: "Virgin Islands" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

export const US_REGIONS = [
  { code: "NORTHEAST", name: "Northeast", states: ["CT", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"] },
  { code: "SOUTHEAST", name: "Southeast", states: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"] },
  { code: "MIDWEST", name: "Midwest", states: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"] },
  { code: "SOUTHWEST", name: "Southwest", states: ["AZ", "NM", "OK", "TX"] },
  { code: "WEST", name: "West", states: ["AK", "CA", "CO", "HI", "ID", "MT", "NV", "OR", "UT", "WA", "WY"] },
  { code: "TERRITORIES", name: "US Territories", states: ["PR", "VI", "DC"] },
] as const;

export const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
] as const;

export function formatGeographicFocus(focus: GeographicFocus | null): string {
  if (!focus) return "Not specified";

  const parts: string[] = [];

  if (focus.regions?.length > 0) {
    const regionNames = focus.regions.map(code => 
      US_REGIONS.find(r => r.code === code)?.name || code
    );
    parts.push(regionNames.join(", "));
  }

  if (focus.states?.length > 0) {
    const stateNames = focus.states.map(code => 
      US_STATES.find(s => s.code === code)?.name || 
      CANADIAN_PROVINCES.find(p => p.code === code)?.name || 
      code
    );
    if (stateNames.length <= 3) {
      parts.push(stateNames.join(", "));
    } else {
      parts.push(`${stateNames.length} states/provinces`);
    }
  }

  if (focus.countries?.length > 0) {
    const countryNames = focus.countries.map(code => 
      COUNTRIES.find(c => c.code === code)?.name || code
    );
    parts.push(countryNames.join(", "));
  }

  return parts.length > 0 ? parts.join(" • ") : "Not specified";
}
