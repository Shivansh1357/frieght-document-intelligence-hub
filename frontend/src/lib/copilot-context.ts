type PruneOptions = {
  maxDepth: number;
  maxArrayLength: number;
  maxStringLength: number;
};

const DEFAULT_OPTS: PruneOptions = {
  maxDepth: 4,
  maxArrayLength: 50,
  maxStringLength: 300,
};

function prune(value: unknown, depth: number, opts: PruneOptions): unknown {
  if (depth > opts.maxDepth) return "[truncated]";

  if (value == null) return value;

  if (typeof value === "string") {
    if (value.length <= opts.maxStringLength) return value;
    return value.slice(0, opts.maxStringLength) + "…";
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const sliced = value.slice(0, opts.maxArrayLength);
    return sliced.map((v) => prune(v, depth + 1, opts));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "undefined") continue;
      out[k] = prune(v, depth + 1, opts);
    }
    return out;
  }

  // functions, symbols, bigints, etc.
  return String(value);
}

export function stringifyCopilotContext(
  input: unknown,
  options?: Partial<PruneOptions>
): string {
  const opts: PruneOptions = { ...DEFAULT_OPTS, ...(options || {}) };
  try {
    return JSON.stringify(prune(input, 0, opts));
  } catch {
    return "{}";
  }
}

