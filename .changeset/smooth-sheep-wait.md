---
"@gqlb/core": patch
"@gqlb/cli": patch
---

Remove FragmentRef<F> in favor of FragmentData<F>.
Added enumValue() function to create static enums.
Selections now evaluated lazily upon first `.document()` call.
