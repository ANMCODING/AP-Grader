"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearSchoolProfile,
  getSavedSchoolProfile,
  saveSchoolProfile,
  type SchoolProfile,
  type SchoolRegionType,
} from "@/lib/client/schoolSelection";
import { reportSchoolSelection } from "@/lib/client/reportSchoolStats";
import { schoolsForRegion } from "@/lib/client/schoolCatalog";
import { INTERNATIONAL_REGIONS, US_STATES } from "@/lib/schools/regions";

type Mode = "loading" | "saved" | "editing";

const PREVIEW_COUNT = 6;
const SEARCH_MAX = 8;

export function SchoolSelector() {
  const [mode, setMode] = useState<Mode>("loading");
  const [saved, setSaved] = useState<SchoolProfile | null>(null);

  const [regionType, setRegionType] = useState<SchoolRegionType>("us");
  const [regionCode, setRegionCode] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [otherSchool, setOtherSchool] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("resetSchool")) {
      clearSchoolProfile();
      params.delete("resetSchool");
      const qs = params.toString();
      const next = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname;
      window.history.replaceState(null, "", next);
      setSaved(null);
      setMode("editing");
      return;
    }

    const profile = getSavedSchoolProfile();
    setSaved(profile);
    setMode(profile ? "saved" : "editing");
  }, []);

  const regionLabel = useMemo(() => {
    const list = regionType === "us" ? US_STATES : INTERNATIONAL_REGIONS;
    return list.find((r) => r.code === regionCode)?.name ?? "";
  }, [regionType, regionCode]);

  useEffect(() => {
    if (!regionCode) {
      setSchoolOptions([]);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    void schoolsForRegion(regionType, regionCode)
      .then((schools) => {
        if (!cancelled) setSchoolOptions(schools);
      })
      .catch(() => {
        if (!cancelled) setSchoolOptions([]);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionType, regionCode]);

  const filteredSchools = useMemo(() => {
    if (schoolOptions.length === 0) return [];
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return schoolOptions.slice(0, PREVIEW_COUNT);
    return schoolOptions
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, SEARCH_MAX);
  }, [schoolOptions, schoolQuery]);

  useEffect(() => {
    if (regionCode && schoolOptions.length > 0) setListOpen(true);
  }, [regionCode, schoolOptions]);

  const schoolValue = schoolQuery.trim();
  const canSave = Boolean(regionCode && regionLabel && schoolValue);

  const finish = useCallback((profile: SchoolProfile) => {
    saveSchoolProfile(profile);
    reportSchoolSelection(profile);
    setSaved(profile);
    setMode("saved");
    setListOpen(false);
  }, []);

  const handleSave = () => {
    if (!canSave) return;
    finish({
      regionType,
      regionCode,
      regionLabel,
      school: schoolValue,
    });
  };

  const startEdit = () => {
    if (saved) {
      setRegionType(saved.regionType);
      setRegionCode(saved.regionCode);
      setSchoolQuery(saved.school);
      setOtherSchool(false);
    }
    setMode("editing");
  };

  const handleClear = () => {
    clearSchoolProfile();
    setSaved(null);
    setRegionCode("");
    setSchoolQuery("");
    setOtherSchool(false);
    setListOpen(false);
    setMode("editing");
  };

  const chooseOtherSchool = () => {
    setOtherSchool(true);
    setSchoolQuery("");
    setListOpen(false);
  };

  if (mode === "loading") return null;

  if (mode === "saved" && saved) {
    return (
      <p className="group -mt-2 mb-4 text-center text-[11px] leading-snug text-ink-faint/70">
        <span className="sr-only">Saved school: </span>
        {saved.school}
        <span className="text-ink-faint/50"> · {saved.regionLabel}</span>
        <span aria-hidden="true"> · </span>
        <button
          type="button"
          onClick={startEdit}
          className="text-ink-faint/50 underline-offset-2 hover:text-ink-muted hover:underline group-hover:text-ink-faint"
        >
          change
        </button>
      </p>
    );
  }

  return (
    <section
      className="mx-auto mb-5 max-w-md rounded-lg border border-surface-border/80 bg-surface-muted/15 px-3 py-3"
      aria-label="School (optional, one-time)"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-ink">Your school</p>
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            Recommended
          </span>
        </div>
        {saved && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-ink-faint hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mb-2 inline-flex rounded-md border border-surface-border bg-white p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => {
            setRegionType("us");
            setRegionCode("");
            setSchoolQuery("");
            setOtherSchool(false);
            setListOpen(false);
          }}
          className={`rounded px-2.5 py-1 font-medium ${
            regionType === "us" ? "bg-ink text-white" : "text-ink-muted"
          }`}
        >
          US
        </button>
        <button
          type="button"
          onClick={() => {
            setRegionType("intl");
            setRegionCode("");
            setSchoolQuery("");
            setOtherSchool(false);
            setListOpen(false);
          }}
          className={`rounded px-2.5 py-1 font-medium ${
            regionType === "intl" ? "bg-ink text-white" : "text-ink-muted"
          }`}
        >
          International
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="mb-0.5 block text-[11px] text-ink-muted">
            {regionType === "us" ? "State" : "Country"}
          </label>
          <select
            value={regionCode}
            onChange={(e) => {
              setRegionCode(e.target.value);
              setSchoolQuery("");
              setOtherSchool(false);
              setListOpen(false);
            }}
            className="w-full rounded-md border border-surface-border bg-white px-2 py-1.5 text-xs text-ink"
          >
            <option value="">Select…</option>
            {(regionType === "us" ? US_STATES : INTERNATIONAL_REGIONS).map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {regionCode && (
          <div>
            <label className="mb-0.5 block text-[11px] text-ink-muted">School</label>
            {otherSchool ? (
              <>
                <input
                  type="text"
                  value={schoolQuery}
                  onChange={(e) => setSchoolQuery(e.target.value)}
                  placeholder="Enter your school name"
                  className="w-full rounded-md border border-surface-border bg-white px-2 py-1.5 text-xs"
                  autoFocus
                />
                {schoolOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtherSchool(false);
                      setSchoolQuery("");
                      setListOpen(true);
                    }}
                    className="mt-1 text-[10px] text-accent hover:underline"
                  >
                    Back to school list
                  </button>
                )}
              </>
            ) : (
              <>
                <input
                  type="search"
                  value={schoolQuery}
                  onChange={(e) => {
                    setSchoolQuery(e.target.value);
                    setListOpen(true);
                  }}
                  onFocus={() => setListOpen(true)}
                  placeholder={
                    listLoading
                      ? "Loading…"
                      : schoolOptions.length
                        ? "Search your school"
                        : "Type school name"
                  }
                  className="w-full rounded-md border border-surface-border bg-white px-2 py-1.5 text-xs"
                />

                {listOpen && schoolOptions.length > 0 && (
                  <div className="mt-1">
                    {filteredSchools.length > 0 && (
                      <>
                        {!schoolQuery.trim() && schoolOptions.length > PREVIEW_COUNT && (
                          <p className="mb-0.5 text-[10px] text-ink-faint">
                            Popular schools — type to search all {schoolOptions.length}
                          </p>
                        )}
                        <ul className="max-h-32 overflow-y-auto rounded-md border border-surface-border bg-white text-xs">
                          {filteredSchools.map((school) => (
                            <li key={school}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSchoolQuery(school);
                                  setListOpen(true);
                                }}
                                className={`w-full px-2 py-1.5 text-left hover:bg-surface-muted ${
                                  schoolQuery === school ? "bg-accent/10 font-medium" : ""
                                }`}
                              >
                                {school}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={chooseOtherSchool}
                      className="mt-1 w-full rounded-md border border-dashed border-surface-border px-2 py-1.5 text-left text-[11px] text-ink-muted hover:border-ink-faint hover:text-ink"
                    >
                      My school isn&apos;t listed — enter other
                    </button>
                  </div>
                )}

                {!listLoading && schoolOptions.length === 0 && (
                  <p className="mt-1 text-[10px] text-ink-faint">
                    No list for this area — type your school above.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-md bg-ink px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </section>
  );
}
