"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { Label } from "@/components/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { X, Plus, Globe, MapPin } from "lucide-react";
import {
  GeographicFocus,
  COUNTRIES,
  US_STATES,
  US_REGIONS,
  CANADIAN_PROVINCES,
} from "@/lib/geography";

interface GeographicFocusSelectorProps {
  value: GeographicFocus | null;
  onChange: (value: GeographicFocus) => void;
}

export function GeographicFocusSelector({
  value,
  onChange,
}: GeographicFocusSelectorProps) {
  const [focus, setFocus] = useState<GeographicFocus>(
    value || { countries: [], states: [], regions: [] }
  );

  useEffect(() => {
    if (value) {
      setFocus(value);
    }
  }, [value]);

  const handleChange = (newFocus: GeographicFocus) => {
    setFocus(newFocus);
    onChange(newFocus);
  };

  const addCountry = (code: string) => {
    if (!focus.countries.includes(code)) {
      handleChange({ ...focus, countries: [...focus.countries, code] });
    }
  };

  const removeCountry = (code: string) => {
    handleChange({
      ...focus,
      countries: focus.countries.filter((c) => c !== code),
    });
  };

  const addRegion = (code: string) => {
    if (!focus.regions.includes(code)) {
      handleChange({ ...focus, regions: [...focus.regions, code] });
    }
  };

  const removeRegion = (code: string) => {
    handleChange({
      ...focus,
      regions: focus.regions.filter((r) => r !== code),
    });
  };

  const addState = (code: string) => {
    if (!focus.states.includes(code)) {
      handleChange({ ...focus, states: [...focus.states, code] });
    }
  };

  const removeState = (code: string) => {
    handleChange({
      ...focus,
      states: focus.states.filter((s) => s !== code),
    });
  };

  const showUSOptions = focus.countries.includes("US");
  const showCanadaOptions = focus.countries.includes("CA");

  const availableCountries = COUNTRIES.filter(
    (c) => !focus.countries.includes(c.code)
  );
  const availableRegions = US_REGIONS.filter(
    (r) => !focus.regions.includes(r.code)
  );
  const availableUSStates = US_STATES.filter(
    (s) => !focus.states.includes(s.code)
  );
  const availableCAProvinces = CANADIAN_PROVINCES.filter(
    (p) => !focus.states.includes(p.code)
  );

  return (
    <div className="space-y-4">
      {/* Countries */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4" />
          Countries
        </Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {focus.countries.map((code) => {
            const country = COUNTRIES.find((c) => c.code === code);
            return (
              <Badge key={code} variant="secondary" className="gap-1 pl-2">
                {country?.name || code}
                <button
                  type="button"
                  onClick={() => removeCountry(code)}
                  className="ml-1 hover:bg-surface-secondary rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
        {availableCountries.length > 0 && (
          <Select onValueChange={addCountry} value="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a country..." />
            </SelectTrigger>
            <SelectContent>
              {availableCountries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* US Regions */}
      {showUSOptions && (
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            US Regions
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {focus.regions.map((code) => {
              const region = US_REGIONS.find((r) => r.code === code);
              return (
                <Badge key={code} variant="secondary" className="gap-1 pl-2">
                  {region?.name || code}
                  <button
                    type="button"
                    onClick={() => removeRegion(code)}
                    className="ml-1 hover:bg-surface-secondary rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          {availableRegions.length > 0 && (
            <Select onValueChange={addRegion} value="">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Add a region..." />
              </SelectTrigger>
              <SelectContent>
                {availableRegions.map((region) => (
                  <SelectItem key={region.code} value={region.code}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* US States */}
      {showUSOptions && (
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            US States
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {focus.states
              .filter((code) => US_STATES.some((s) => s.code === code))
              .map((code) => {
                const state = US_STATES.find((s) => s.code === code);
                return (
                  <Badge key={code} variant="secondary" className="gap-1 pl-2">
                    {state?.name || code}
                    <button
                      type="button"
                      onClick={() => removeState(code)}
                      className="ml-1 hover:bg-surface-secondary rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
          </div>
          {availableUSStates.length > 0 && (
            <Select onValueChange={addState} value="">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Add a state..." />
              </SelectTrigger>
              <SelectContent>
                {availableUSStates.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Canadian Provinces */}
      {showCanadaOptions && (
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            Canadian Provinces
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {focus.states
              .filter((code) => CANADIAN_PROVINCES.some((p) => p.code === code))
              .map((code) => {
                const province = CANADIAN_PROVINCES.find((p) => p.code === code);
                return (
                  <Badge key={code} variant="secondary" className="gap-1 pl-2">
                    {province?.name || code}
                    <button
                      type="button"
                      onClick={() => removeState(code)}
                      className="ml-1 hover:bg-surface-secondary rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
          </div>
          {availableCAProvinces.length > 0 && (
            <Select onValueChange={addState} value="">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Add a province..." />
              </SelectTrigger>
              <SelectContent>
                {availableCAProvinces.map((province) => (
                  <SelectItem key={province.code} value={province.code}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {focus.countries.length === 0 &&
        focus.regions.length === 0 &&
        focus.states.length === 0 && (
          <p className="text-sm text-text-tertiary">
            Select countries to see regional options.
          </p>
        )}
    </div>
  );
}
