# Lessons Learned

Reviewed at session start. Updated after every bug, correction, failed build, or schema redesign.

---

## Lesson 1: JavaScript `-0` in currency rounding

**Mistake:** `roundCurrency(-0.001)` returned `-0` instead of `0`.

**Root cause:** `Math.round()` produces `-0` for very small negative numbers close to zero. JavaScript treats `-0 === 0` as `true`, but `JSON.stringify(-0)` returns `"0"` while `Object.is(-0, 0)` returns `false`. This can cause subtle bugs in financial comparisons and display.

**Fix:** Added explicit normalisation: `return result === 0 ? 0 : result;`

**Preventative rule:** Always normalise `-0` to `0` in any currency/financial rounding function. Add test cases for edge values around zero.

---

## Lesson 2: Supabase Database generic format

**Mistake:** Custom `Database` type interface was missing `Relationships`, `Views`, `Functions`, `Enums`, and `CompositeTypes` fields required by Supabase's type system. This caused all query return types to resolve to `never`.

**Root cause:** Supabase's `createServerClient<Database>()` and `createBrowserClient<Database>()` expect the full type structure including `Relationships` on each table and `Views`, `Functions`, `Enums`, `CompositeTypes` on the public schema. Omitting them breaks type inference.

**Fix:** Added all required fields to the Database interface. For unused sections, used `Record<string, never>`.

**Preventative rule:** When manually defining Supabase Database types, always include the full structure: `Tables` (with `Relationships` on each), `Views`, `Functions`, `Enums`, `CompositeTypes`. Prefer generating types with `supabase gen types typescript` when a live database is available.

---

## Lesson 3: shadcn `toast` component deprecated

**Mistake:** Attempted `npx shadcn add toast` which no longer exists.

**Root cause:** shadcn/ui replaced the custom toast component with `sonner` (a third-party toast library) in recent versions.

**Fix:** Used `npx shadcn add sonner` and imported from `sonner` package directly.

**Preventative rule:** When adding shadcn components, check the latest shadcn/ui docs. If a component fails to install, check for renamed or replaced components before debugging further.

---

## Lesson 4: `create-next-app` interactive prompts

**Mistake:** `npx create-next-app` hung during scaffolding because it prompted for React Compiler (a new interactive question).

**Root cause:** CLI tools add new interactive prompts over time. Running them in non-interactive environments (like agent sessions) causes hangs.

**Fix:** Piped `echo "n"` to the command to auto-answer the prompt.

**Preventative rule:** When running scaffolding tools, use `--yes` or equivalent flags to skip prompts. If not available, pipe default answers.

---

## Lesson 5: TypeScript `interface` vs `type` for Supabase Database generics

**Mistake:** All entity types (Organisation, Profile, etc.) were declared as `interface`. When used as `Row` in the Supabase `Database` generic, the `from().select('*')` queries returned `{}` instead of the actual row type.

**Root cause:** TypeScript `interface` declarations don't implicitly satisfy `Record<string, unknown>` because interfaces lack implicit index signatures. Supabase's `GenericTable` requires `Row: Record<string, unknown>`. When the check fails, the type system can't resolve row fields. Type aliases (`type X = { ... }`) DO satisfy `Record<string, unknown>`.

**Fix:** Changed all entity declarations from `interface` to `type` aliases.

**Preventative rule:** Always use `type` aliases (not `interface`) for Supabase row types. Reserve `interface` for extensible contracts.

---

## Lesson 6: `Record<string, never>` vs `{}` in Supabase Database schema

**Mistake:** Used `Views: Record<string, never>` and `Functions: Record<string, never>` for empty Views/Functions in the Database type. This caused `select('*')` to return `{}` for all tables.

**Root cause:** `Record<string, never>` means "every string is a valid key" (with `never` values). Supabase's `GetComputedFields` type checks if each row field name exists in `Schema['Functions']`. Since `Record<string, never>` matches ALL string keys, every field was incorrectly treated as a "computed field" and omitted from `*` results.

**Fix:** Changed to `Views: {}` and `Functions: {}` (empty object — no keys).

**Preventative rule:** Use `{}` (not `Record<string, never>`) for empty sections in Supabase Database types. `Record<string, never>` and `{}` have fundamentally different semantics in TypeScript.
