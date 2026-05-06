import test from "node:test";
import assert from "node:assert/strict";
import { roleLabel } from "@/lib/portal-roles";

test("role labels are stable", () => {
  assert.equal(roleLabel("admin"), "Administrator");
  assert.equal(roleLabel("operator"), "Operater");
  assert.equal(roleLabel("viewer"), "Pregled");
});
