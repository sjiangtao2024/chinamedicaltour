import test from "node:test";
import assert from "node:assert/strict";
import { normalizeIntakeProfile, insertOrderProfile } from "../lib/profile.js";

const createDbSpy = () => {
  const calls = [];
  return {
    calls,
    db: {
      prepare(query) {
        const call = { query, binds: [] };
        calls.push(call);
        return {
          bind(...params) {
            call.binds = params;
            return {
              run() {
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
};

test("normalizeIntakeProfile maps intake fields", () => {
  const profile = normalizeIntakeProfile({
    nationality: "Canada",
    travelDate: "2026-03-01",
    travelGroupSize: "3",
  });

  assert.deepEqual(profile, {
    nationality: "Canada",
    travel_date: "2026-03-01",
    travel_group_size: "3",
  });
});

test("insertOrderProfile persists intake travel fields", async () => {
  const { db, calls } = createDbSpy();

  await insertOrderProfile(db, "order-1", {
    nationality: "Canada",
    travel_date: "2026-03-01",
    travel_group_size: "3",
  });

  assert.equal(calls.length, 1);
  const { query, binds } = calls[0];
  assert.ok(query.includes("nationality"));
  assert.ok(query.includes("travel_date"));
  assert.ok(query.includes("travel_group_size"));
  assert.equal(binds[binds.length - 4], "Canada");
  assert.equal(binds[binds.length - 3], "2026-03-01");
  assert.equal(binds[binds.length - 2], "3");
});
