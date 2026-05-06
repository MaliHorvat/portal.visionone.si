import test from "node:test";
import assert from "node:assert/strict";
import { signPortalSessionToken } from "@/lib/portal-session-sign";
import { verifyPortalSessionToken } from "@/lib/portal-session-verify";

test("sign/verify keeps role and force-password flag", async () => {
  const token = signPortalSessionToken(
    {
      username: "janez",
      role: "operator",
      mustChangePassword: true,
      maxAgeSec: 600,
    },
    "test-secret",
  );

  const payload = await verifyPortalSessionToken(token, "test-secret");
  assert.ok(payload);
  assert.equal(payload.username, "janez");
  assert.equal(payload.role, "operator");
  assert.equal(payload.mustChangePassword, true);
});

test("verify fails with wrong secret", async () => {
  const token = signPortalSessionToken(
    {
      username: "ana",
      role: "viewer",
      mustChangePassword: false,
      maxAgeSec: 600,
    },
    "secret-a",
  );
  const payload = await verifyPortalSessionToken(token, "secret-b");
  assert.equal(payload, null);
});
