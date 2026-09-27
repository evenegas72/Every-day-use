// Security-rule tests for Dad's Care Log, run against the local Firebase
// emulators: `npm test` in this folder. The family emails are read from the
// rules files, so these tests keep working after the real emails go in.

import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp,
  setDoc, Timestamp, updateDoc,
} from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

const FIRESTORE_RULES = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const STORAGE_RULES = readFileSync(new URL("../storage.rules", import.meta.url), "utf8");

function allowList(rules) {
  const body = /email\.lower\(\) in \[([\s\S]*?)\]/.exec(rules);
  assert.ok(body, "allow-list not found in rules");
  return [...body[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function familyNames(rules) {
  const body = /function familyNames\(\) \{\s*return \{([\s\S]*?)\};/.exec(rules);
  assert.ok(body, "familyNames map not found in firestore.rules");
  return Object.fromEntries([...body[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
}

const NAMES = familyNames(FIRESTORE_RULES);
const FAMILY = Object.keys(NAMES);
const ALICE = { uid: "familyUid1", email: FAMILY[0], name: NAMES[FAMILY[0]] };
const BOB = { uid: "familyUid2", email: FAMILY[1], name: NAMES[FAMILY[1]] };
const STRANGER = { uid: "strangerUid", email: "stranger@example.com", name: NAMES[FAMILY[0]] };

let env;

function as(user, extra = {}) {
  return env.authenticatedContext(user.uid, { email: user.email, email_verified: true, ...extra });
}

function goodEntry(user, overrides = {}) {
  return {
    when: Timestamp.fromDate(new Date("2026-09-27T20:30:00Z")),
    who: user.name,
    doctor: "Todo bien",
    authorEmail: user.email.toLowerCase(),
    authorUid: user.uid,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-care-log",
    firestore: { rules: FIRESTORE_RULES },
    storage: { rules: STORAGE_RULES },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});

describe("allow-lists", () => {
  test("firestore.rules and storage.rules list the same emails", () => {
    assert.deepEqual(allowList(STORAGE_RULES), FAMILY);
  });
  test("one lowercase email per family member, no duplicates", () => {
    assert.equal(FAMILY.length, 8);
    assert.equal(new Set(FAMILY).size, FAMILY.length);
    for (const email of FAMILY) assert.equal(email, email.toLowerCase(), email);
  });
  test("each of the eight names appears exactly once", () => {
    assert.deepEqual(Object.values(NAMES).sort(),
      ["Adriana", "Alejandro", "Chavita", "Daniel", "Enrique", "Lorena", "Salvador", "Teresa"]);
  });
});

describe("firestore: who can read", () => {
  test("signed-out visitors cannot read", async () => {
    await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), "entries")));
  });
  test("signed-in non-family cannot read", async () => {
    await assertFails(getDocs(collection(as(STRANGER).firestore(), "entries")));
  });
  test("family with unverified email cannot read", async () => {
    await assertFails(getDocs(collection(as(ALICE, { email_verified: false }).firestore(), "entries")));
  });
  test("family can read", async () => {
    await assertSucceeds(getDocs(collection(as(ALICE).firestore(), "entries")));
  });
  test("family email in different letter case still matches", async () => {
    const shouty = { uid: ALICE.uid, email: ALICE.email.toUpperCase() };
    await assertSucceeds(getDocs(collection(as(shouty).firestore(), "entries")));
  });
  test("other collections are closed", async () => {
    await assertFails(getDocs(collection(as(ALICE).firestore(), "other")));
    await assertFails(setDoc(doc(as(ALICE).firestore(), "other/x"), { a: 1 }));
  });
});

describe("firestore: creating entries", () => {
  test("family can create a well-formed entry", async () => {
    await assertSucceeds(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE)));
  });
  test("non-family cannot create", async () => {
    await assertFails(addDoc(collection(as(STRANGER).firestore(), "entries"), goodEntry(STRANGER)));
  });
  test("cannot post under someone else's email or uid", async () => {
    const db = as(ALICE).firestore();
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { authorEmail: BOB.email })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { authorUid: BOB.uid })));
  });
  test("createdAt must be the server's time", async () => {
    const db = as(ALICE).firestore();
    await assertFails(addDoc(collection(db, "entries"),
      goodEntry(ALICE, { createdAt: Timestamp.fromDate(new Date("2020-01-01")) })));
  });
  test("who must be one of the eight family names", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, { who: "Pedro" })));
  });
  test("who must be the signed-in person's own name", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, { who: BOB.name })));
  });
  test("unknown fields are refused", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, { extra: "x" })));
  });
  test("an entry with no content is refused", async () => {
    const { doctor, ...empty } = goodEntry(ALICE);
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), empty));
  });
  test("when must be a timestamp", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, { when: "ayer" })));
  });
});

describe("firestore: photo fields", () => {
  const ownPath = `dad-care-log/photos/${ALICE.uid}/1.jpg`;

  test("photo with a confirmed AI reading is accepted", async () => {
    await assertSucceeds(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, {
      photoPath: ownPath, photoKind: "monitor",
      photoReading: "Presión arterial: 128/82 mmHg", photoReadingSource: "ai", photoReadingConfirmed: true,
    })));
  });
  test("photo with no reading is accepted", async () => {
    await assertSucceeds(addDoc(collection(as(ALICE).firestore(), "entries"),
      goodEntry(ALICE, { photoPath: ownPath, photoKind: "note" })));
  });
  test("an AI reading that was not confirmed is refused", async () => {
    const db = as(ALICE).firestore();
    const base = { photoPath: ownPath, photoKind: "monitor", photoReading: "128/82", photoReadingSource: "ai" };
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, base)));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { ...base, photoReadingConfirmed: false })));
  });
  test("a reading without a photo is refused", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, {
      photoReading: "128/82", photoReadingSource: "ai", photoReadingConfirmed: true,
    })));
  });
  test("a photo path in someone else's folder is refused", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"), goodEntry(ALICE, {
      photoPath: `dad-care-log/photos/${BOB.uid}/1.jpg`, photoKind: "monitor",
    })));
  });
  test("an unknown photo kind is refused", async () => {
    await assertFails(addDoc(collection(as(ALICE).firestore(), "entries"),
      goodEntry(ALICE, { photoPath: ownPath, photoKind: "xray" })));
  });
});

describe("firestore: whoami", () => {
  test("family can look up their own name", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE).firestore(), `whoami/${ALICE.name}`)));
  });
  test("family can't probe other names", async () => {
    await assertFails(getDoc(doc(as(ALICE).firestore(), `whoami/${BOB.name}`)));
  });
  test("non-family can't look up any name", async () => {
    await assertFails(getDoc(doc(as(STRANGER).firestore(), `whoami/${ALICE.name}`)));
  });
  test("whoami can't be listed or written", async () => {
    await assertFails(getDocs(collection(as(ALICE).firestore(), "whoami")));
    await assertFails(setDoc(doc(as(ALICE).firestore(), `whoami/${ALICE.name}`), { a: 1 }));
  });
});

describe("firestore: entries are append-only", () => {
  const entryPath = "entries/existing";

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), entryPath), {
        ...goodEntry(ALICE), createdAt: Timestamp.now(),
      });
    });
  });

  test("the author can read it", async () => {
    await assertSucceeds(getDoc(doc(as(ALICE).firestore(), entryPath)));
  });
  test("the author cannot update it", async () => {
    await assertFails(updateDoc(doc(as(ALICE).firestore(), entryPath), { doctor: "cambiado" }));
  });
  test("the author cannot overwrite it with set()", async () => {
    await assertFails(setDoc(doc(as(ALICE).firestore(), entryPath), goodEntry(ALICE, { doctor: "cambiado" })));
  });
  test("the author cannot delete it", async () => {
    await assertFails(deleteDoc(doc(as(ALICE).firestore(), entryPath)));
  });
  test("other family members cannot update or delete it", async () => {
    await assertFails(updateDoc(doc(as(BOB).firestore(), entryPath), { doctor: "cambiado" }));
    await assertFails(deleteDoc(doc(as(BOB).firestore(), entryPath)));
  });
});

describe("firestore: corrections", () => {
  const alicePhoto = `dad-care-log/photos/${ALICE.uid}/1.jpg`;

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "entries/original"), {
        ...goodEntry(ALICE), createdAt: Timestamp.now(), photoPath: alicePhoto, photoKind: "monitor",
      });
    });
  });

  test("any family member can add a correction of an existing entry", async () => {
    await assertSucceeds(addDoc(collection(as(BOB).firestore(), "entries"),
      goodEntry(BOB, { correctsId: "original", doctor: "Corregido" })));
  });
  test("a correction must point at an entry that exists", async () => {
    await assertFails(addDoc(collection(as(BOB).firestore(), "entries"),
      goodEntry(BOB, { correctsId: "doesNotExist" })));
  });
  test("correctsId must be a plain document id", async () => {
    const db = as(BOB).firestore();
    await assertFails(addDoc(collection(db, "entries"), goodEntry(BOB, { correctsId: 42 })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(BOB, { correctsId: "a/b" })));
  });
  test("a correction can reuse the corrected entry's photo with a fixed reading", async () => {
    await assertSucceeds(addDoc(collection(as(BOB).firestore(), "entries"), goodEntry(BOB, {
      correctsId: "original", photoPath: alicePhoto, photoKind: "monitor",
      photoReading: "Pulso: 74 lpm", photoReadingSource: "person", photoReadingConfirmed: true,
    })));
  });
  test("reusing someone else's photo without correcting that entry is refused", async () => {
    await assertFails(addDoc(collection(as(BOB).firestore(), "entries"),
      goodEntry(BOB, { photoPath: alicePhoto, photoKind: "monitor" })));
  });
  test("a correction can't borrow a photo the corrected entry doesn't have", async () => {
    await assertFails(addDoc(collection(as(BOB).firestore(), "entries"), goodEntry(BOB, {
      correctsId: "original", photoPath: `dad-care-log/photos/${ALICE.uid}/2.jpg`, photoKind: "monitor",
    })));
  });
  test("the original is still unchangeable after a correction", async () => {
    await addDoc(collection(as(BOB).firestore(), "entries"), goodEntry(BOB, { correctsId: "original" }));
    await assertFails(updateDoc(doc(as(ALICE).firestore(), "entries/original"), { doctor: "x" }));
    await assertFails(deleteDoc(doc(as(ALICE).firestore(), "entries/original")));
  });
});

describe("storage: photos", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const meta = { contentType: "image/jpeg" };
  const ownPath = `dad-care-log/photos/${ALICE.uid}/1.jpg`;

  test("family can upload a photo to their own folder", async () => {
    await assertSucceeds(uploadBytes(ref(as(ALICE).storage(), ownPath), jpeg, meta));
  });
  test("family cannot upload into someone else's folder", async () => {
    await assertFails(uploadBytes(ref(as(ALICE).storage(), `dad-care-log/photos/${BOB.uid}/1.jpg`), jpeg, meta));
  });
  test("non-family cannot upload", async () => {
    await assertFails(uploadBytes(ref(as(STRANGER).storage(), `dad-care-log/photos/${STRANGER.uid}/1.jpg`), jpeg, meta));
  });
  test("only images are accepted", async () => {
    await assertFails(uploadBytes(ref(as(ALICE).storage(), ownPath), jpeg, { contentType: "text/html" }));
  });
  test("photos over 10 MB are refused", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(as(ALICE).storage(), ownPath), big, meta));
  });
  test("uploads outside dad-care-log/photos are refused", async () => {
    await assertFails(uploadBytes(ref(as(ALICE).storage(), "public/1.jpg"), jpeg, meta));
  });

  describe("after upload", () => {
    beforeEach(async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await uploadBytes(ref(ctx.storage(), ownPath), jpeg, meta);
      });
    });
    test("other family members can view it", async () => {
      await assertSucceeds(getBytes(ref(as(BOB).storage(), ownPath)));
    });
    test("non-family cannot view it", async () => {
      await assertFails(getBytes(ref(as(STRANGER).storage(), ownPath)));
    });
    test("nobody can replace it", async () => {
      await assertFails(uploadBytes(ref(as(ALICE).storage(), ownPath), jpeg, meta));
    });
    test("nobody can delete it", async () => {
      await assertFails(deleteObject(ref(as(ALICE).storage(), ownPath)));
    });
  });
});
