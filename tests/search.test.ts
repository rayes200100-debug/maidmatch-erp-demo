import { describe, it, expect } from "vitest";
import { searchByFields, levenshtein, type SearchFields } from "../src/lib/search";

function m(name: string, overrides: Partial<SearchFields> = {}): SearchFields {
  return {
    name,
    maidsCcId: "",
    mobile: "",
    whatsapp: "",
    passportNumber: "",
    ...overrides,
  };
}

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("mary", "mary")).toBe(0);
    expect(levenshtein("mary", "mari")).toBe(1);
    expect(levenshtein("mary", "marie")).toBe(2);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("searchByFields", () => {
  it("returns everything for an empty query", () => {
    const items = [m("Mary Santos"), m("Maria Cruz")];
    expect(searchByFields(items, "")).toEqual(items);
  });

  it("Mary matches Mary, Marie, Maryam and Mari", () => {
    const items = [
      m("Mary Smith"),
      m("Marie Curie"),
      m("Maryam Ali"),
      m("Mari Chen"),
      m("Nadia Hassan"),
    ];
    const names = searchByFields(items, "Mary").map((x) => x.name);
    expect(names).toEqual(expect.arrayContaining(["Mary Smith", "Marie Curie", "Maryam Ali", "Mari Chen"]));
    expect(names).not.toContain("Nadia Hassan");
  });

  it("misspelling still finds the maid (Maary -> Mary)", () => {
    const items = [m("Mary Santos"), m("Nadia Hassan")];
    expect(searchByFields(items, "Maary").map((x) => x.name)).toContain("Mary Santos");
  });

  it("second name finds the maid", () => {
    const items = [m("Maria Santos"), m("Amina Bekele")];
    expect(searchByFields(items, "Santos").map((x) => x.name)).toEqual(["Maria Santos"]);
  });

  it("partial name matches", () => {
    const items = [m("Maria Santos"), m("Mario Rossi")];
    expect(searchByFields(items, "Sant").map((x) => x.name)).toEqual(["Maria Santos"]);
  });

  it("phone digits match a formatted number", () => {
    const items = [m("Maria Santos", { mobile: "+971 50 100 1201" }), m("Nadia", { mobile: "+971 55 000 0000" })];
    expect(searchByFields(items, "501001201").map((x) => x.name)).toEqual(["Maria Santos"]);
  });

  it("ERP id substring matches", () => {
    const items = [m("Amina", { maidsCcId: "CC-1042" }), m("Nadia", { maidsCcId: "CC-9999" })];
    expect(searchByFields(items, "1042").map((x) => x.name)).toEqual(["Amina"]);
  });

  it("passport number matches", () => {
    const items = [m("Maria", { passportNumber: "P1234567" }), m("Nadia", { passportNumber: "P9999999" })];
    expect(searchByFields(items, "P1234567").map((x) => x.name)).toEqual(["Maria"]);
  });

  it("ranks an exact name match above a fuzzy one", () => {
    const items = [m("Mari Chen"), m("Mary Smith")];
    expect(searchByFields(items, "Mary")[0].name).toBe("Mary Smith");
  });
});
