import { z } from "zod";
import { format, isValid, parse } from "date-fns";

const emptyToOk = (schema: z.ZodTypeAny) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((v) => v === "" || schema.safeParse(v).success, {
      message: "Invalid value",
    });

const numberString = z
  .string()
  .transform((s) => s.trim().replace(/,/g, ""))
  .refine((v) => v === "" || /^-?\d+(\.\d+)?$/.test(v), {
    message: "Enter a valid number",
  });

const intString = z
  .string()
  .transform((s) => s.trim().replace(/,/g, ""))
  .refine((v) => v === "" || /^-?\d+$/.test(v), {
    message: "Enter a whole number",
  });

const currencyString = z
  .string()
  .transform((s) => s.trim())
  .refine((v) => v === "" || /^[A-Za-z]{3}$/.test(v), {
    message: "Currency must be a 3-letter code (e.g. USD)",
  })
  .transform((v) => (v ? v.toUpperCase() : v));

const dateString = z
  .string()
  .transform((s) => s.trim())
  .refine(
    (v) => {
      if (v === "") return true;
      // Accept dd/MM/yyyy (UI), also allow yyyy-MM-dd for paste.
      const d1 = parse(v, "dd/MM/yyyy", new Date());
      if (isValid(d1) && format(d1, "dd/MM/yyyy") === v) return true;
      const d2 = parse(v, "yyyy-MM-dd", new Date());
      return isValid(d2) && format(d2, "yyyy-MM-dd") === v;
    },
    { message: "Date must be DD/MM/YYYY (or YYYY-MM-DD)" }
  )
  .transform((v) => {
    if (!v) return v;
    const d1 = parse(v, "dd/MM/yyyy", new Date());
    if (isValid(d1) && format(d1, "dd/MM/yyyy") === v) return format(d1, "yyyy-MM-dd");
    const d2 = parse(v, "yyyy-MM-dd", new Date());
    if (isValid(d2) && format(d2, "yyyy-MM-dd") === v) return v;
    return v;
  });

const listString = z
  .string()
  .transform((s) => s.trim())
  .refine((v) => v === "" || v.length <= 2000, {
    message: "Too long",
  });

// Field-specific schemas (string in, string out; normalized when useful)
const FIELD_SCHEMAS: Record<string, z.ZodType<string>> = {
  document_date: dateString,
  total_declared_value: numberString,
  total_gross_weight: numberString,
  total_net_weight: numberString,
  overall_confidence: numberString,
  total_packages: intString,
  package_count: intString,
  pallet_count: intString,
  currency: currencyString,
  reference_numbers: listString,
  container_numbers: listString,
};

export function validateCorrectionField(fieldName: string, value: string): {
  ok: boolean;
  normalized: string;
  error?: string;
} {
  const schema = FIELD_SCHEMAS[fieldName];
  if (!schema) {
    // Default: accept as-is, but trim (avoid accidental spaces).
    return { ok: true, normalized: value.trim() };
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      normalized: value,
      error: parsed.error.issues[0]?.message || "Invalid value",
    };
  }
  return { ok: true, normalized: parsed.data };
}

