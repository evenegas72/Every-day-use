// Security-rule tests for the Care Log, run against the local Firebase
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
  setDoc, Timestamp, updateDoc, writeBatch,
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
const ADMIN_EMAIL = /myEmail\(\) == '([^']+)'/.exec(FIRESTORE_RULES)[1];
const ADMIN = { uid: "adminUid", email: ADMIN_EMAIL, name: NAMES[ADMIN_EMAIL] };
const NON_ADMIN_EMAIL = FAMILY.find((e) => e !== ADMIN_EMAIL);
const CAROL = { uid: "familyUid3", email: NON_ADMIN_EMAIL, name: NAMES[NON_ADMIN_EMAIL] };
const STRANGER = { uid: "strangerUid", email: "stranger@example.com", name: NAMES[FAMILY[0]] };

let env;

function as(user, extra = {}) {
  return env.authenticatedContext(user.uid, { email: user.email, email_verified: true, ...extra });
}

function goodEntry(user, overrides = {}) {
  return {
    when: Timestamp.fromDate(new Date("2026-09-27T20:30:00Z")),
    who: user.name,
    patient: "Paciente de prueba",
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
  test("the patient's name is required", async () => {
    const { patient, ...noPatient } = goodEntry(ALICE);
    const db = as(ALICE).firestore();
    await assertFails(addDoc(collection(db, "entries"), noPatient));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { patient: "" })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { patient: "x".repeat(101) })));
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
  test("AI information is saved only with a confirmed reading", async () => {
    const db = as(ALICE).firestore();
    const reading = { photoPath: ownPath, photoKind: "monitor", photoReading: "FiO2: 65 %", photoReadingSource: "ai", photoReadingConfirmed: true };
    const flags = [{ label: "FiO2", value: "65 %", generalRange: "21 %", status: "above" }];
    await assertSucceeds(addDoc(collection(db, "entries"), goodEntry(ALICE, { ...reading, aiFlags: flags, aiQuestions: ["¿Cuál es la meta?"] })));
    await assertSucceeds(addDoc(collection(db, "entries"), goodEntry(ALICE, { ...reading, aiFlags: [], aiQuestions: [] })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { ...reading, aiFlags: flags })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { aiFlags: flags, aiQuestions: [] })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { ...reading, aiFlags: flags, aiQuestions: Array(9).fill("x") })));
  });
  test("a kept AI question and answer is accepted, and can be the entry's only content", async () => {
    const db = as(ALICE).firestore();
    const aiAsk = { question: "Derrame pleural bilateral y neumonía", answer: "Explicación general…", questions: ["¿Cuánto líquido hay?"] };
    await assertSucceeds(addDoc(collection(db, "entries"), goodEntry(ALICE, { aiAsk })));
    const { doctor, ...onlyAsk } = goodEntry(ALICE, { aiAsk });
    await assertSucceeds(addDoc(collection(db, "entries"), onlyAsk));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { aiAsk: { ...aiAsk, extra: 1 } })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { aiAsk: { ...aiAsk, answer: "" } })));
    await assertFails(addDoc(collection(db, "entries"), goodEntry(ALICE, { aiAsk: { ...aiAsk, questions: Array(9).fill("x") } })));
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
  test("the author cannot delete it (non-admin)", async () => {
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

describe("firestore: admin deletion", () => {
  const entryPath = "entries/testEntry";
  let entry;

  beforeEach(async () => {
    entry = { ...goodEntry(CAROL), createdAt: Timestamp.now() };
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), entryPath), entry);
    });
  });

  function logFor(user, overrides = {}) {
    return {
      deletedBy: user.email, deletedAt: serverTimestamp(),
      entryWhen: entry.when, entryWho: entry.who, entryPatient: entry.patient,
      reason: "Entrada de prueba", ...overrides,
    };
  }

  function deleteWithLog(user, overrides) {
    const db = as(user).firestore();
    const batch = writeBatch(db);
    batch.delete(doc(db, entryPath));
    batch.set(doc(db, "deletions/testEntry"), logFor(user, overrides));
    return batch.commit();
  }

  test("the admin email is in the family list", () => {
    assert.ok(FAMILY.includes(ADMIN_EMAIL));
  });
  test("admin can delete an entry together with a deletion record", async () => {
    await assertSucceeds(deleteWithLog(ADMIN));
  });
  test("admin can't delete without leaving a record", async () => {
    await assertFails(deleteDoc(doc(as(ADMIN).firestore(), entryPath)));
  });
  test("a non-admin family member can't delete, even with a record", async () => {
    await assertFails(deleteWithLog(CAROL));
  });
  test("a reason of at least 3 characters is required", async () => {
    const db = as(ADMIN).firestore();
    const { reason, ...noReason } = logFor(ADMIN);
    const batch = writeBatch(db);
    batch.delete(doc(db, entryPath));
    batch.set(doc(db, "deletions/testEntry"), noReason);
    await assertFails(batch.commit());
    await assertFails(deleteWithLog(ADMIN, { reason: "  a " }));
    await assertFails(deleteWithLog(ADMIN, { reason: "x".repeat(301) }));
  });
  test("the record must describe the entry truthfully", async () => {
    await assertFails(deleteWithLog(ADMIN, { entryWho: "Otro" }));
    await assertFails(deleteWithLog(ADMIN, { deletedAt: Timestamp.fromDate(new Date("2020-01-01")) }));
  });
  test("a deletion record can't be written without deleting the entry", async () => {
    await assertFails(setDoc(doc(as(ADMIN).firestore(), "deletions/testEntry"), logFor(ADMIN)));
  });
  test("admin still can't edit entries", async () => {
    await assertFails(updateDoc(doc(as(ADMIN).firestore(), entryPath), { doctor: "x" }));
  });
  test("family can read the deletion log; nobody can change it", async () => {
    await deleteWithLog(ADMIN);
    await assertSucceeds(getDocs(collection(as(CAROL).firestore(), "deletions")));
    await assertFails(getDocs(collection(as(STRANGER).firestore(), "deletions")));
    await assertFails(updateDoc(doc(as(ADMIN).firestore(), "deletions/testEntry"), { entryWho: "x" }));
    await assertFails(updateDoc(doc(as(ADMIN).firestore(), "deletions/testEntry"), { reason: "otro motivo" }));
    await assertFails(deleteDoc(doc(as(ADMIN).firestore(), "deletions/testEntry")));
  });
  test("only family passes the family check", async () => {
    await assertSucceeds(getDoc(doc(as(CAROL).firestore(), "familycheck/me")));
    await assertFails(getDoc(doc(as(STRANGER).firestore(), "familycheck/me")));
  });
  test("only the admin passes the admin check", async () => {
    await assertSucceeds(getDoc(doc(as(ADMIN).firestore(), "admincheck/me")));
    await assertFails(getDoc(doc(as(CAROL).firestore(), "admincheck/me")));
  });
});

describe("firestore: watch shifts", () => {
  const start = Timestamp.fromDate(new Date("2026-10-01T14:00:00Z"));
  const end = Timestamp.fromDate(new Date("2026-10-02T14:00:00Z"));
  function shift(user, overrides = {}) {
    return { person: user.name, start, end, note: "Noche", createdBy: user.email, createdAt: serverTimestamp(), ...overrides };
  }

  test("family can add a shift for themselves", async () => {
    await assertSucceeds(addDoc(collection(as(CAROL).firestore(), "shifts"), shift(CAROL)));
  });
  test("nobody can add a shift under someone else's name, admin included", async () => {
    await assertFails(addDoc(collection(as(CAROL).firestore(), "shifts"), shift(CAROL, { person: ADMIN.name })));
    await assertFails(addDoc(collection(as(ADMIN).firestore(), "shifts"), shift(ADMIN, { person: CAROL.name })));
  });
  test("non-family can't read or add shifts", async () => {
    await assertFails(getDocs(collection(as(STRANGER).firestore(), "shifts")));
    await assertFails(addDoc(collection(as(STRANGER).firestore(), "shifts"), shift(STRANGER)));
  });
  test("shift must be for a family name, end after start, at most 31 days", async () => {
    const db = as(CAROL).firestore();
    await assertFails(addDoc(collection(db, "shifts"), shift(CAROL, { person: "Pedro" })));
    await assertFails(addDoc(collection(db, "shifts"), shift(CAROL, { end: start })));
    await assertFails(addDoc(collection(db, "shifts"), shift(CAROL, {
      end: Timestamp.fromDate(new Date("2026-11-15T14:00:00Z")) })));
  });
  test("createdBy must be the signed-in account", async () => {
    await assertFails(addDoc(collection(as(CAROL).firestore(), "shifts"), shift(CAROL, { createdBy: ADMIN.email })));
  });
  test("who added it or the admin can remove it; others can't; nobody edits", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "shifts/a"), { ...shift(CAROL), createdAt: Timestamp.now() });
      await setDoc(doc(ctx.firestore(), "shifts/b"), { ...shift(CAROL), createdAt: Timestamp.now() });
    });
    const other = { uid: "otherUid", email: FAMILY.find((e) => e !== ADMIN_EMAIL && e !== CAROL.email) };
    await assertFails(deleteDoc(doc(as(other).firestore(), "shifts/a")));
    await assertFails(updateDoc(doc(as(CAROL).firestore(), "shifts/a"), { note: "x" }));
    await assertSucceeds(deleteDoc(doc(as(CAROL).firestore(), "shifts/a")));
    await assertSucceeds(deleteDoc(doc(as(ADMIN).firestore(), "shifts/b")));
  });
});

describe("firestore: availability board", () => {
  const good = (user, overrides = {}) => ({
    days: { lun: { from: "20:00", to: "08:00" }, sab: { from: "09:00", to: "21:00" } },
    note: "Solo noches entre semana", updatedAt: serverTimestamp(), updatedBy: user.email, ...overrides,
  });

  test("each person writes and updates only their own row", async () => {
    const db = as(CAROL).firestore();
    await assertSucceeds(setDoc(doc(db, `availability/${CAROL.name}`), good(CAROL)));
    await assertSucceeds(setDoc(doc(db, `availability/${CAROL.name}`), good(CAROL, { days: {} })));
    await assertFails(setDoc(doc(db, `availability/${ADMIN.name}`), good(CAROL)));
    await assertFails(setDoc(doc(as(ADMIN).firestore(), `availability/${CAROL.name}`), good(ADMIN)));
  });
  test("family reads the whole board; outsiders can't", async () => {
    await assertSucceeds(getDocs(collection(as(CAROL).firestore(), "availability")));
    await assertFails(getDocs(collection(as(STRANGER).firestore(), "availability")));
  });
  test("days and times must be well formed", async () => {
    const db = as(CAROL).firestore();
    const path = `availability/${CAROL.name}`;
    await assertFails(setDoc(doc(db, path), good(CAROL, { days: { funday: { from: "08:00", to: "10:00" } } })));
    await assertFails(setDoc(doc(db, path), good(CAROL, { days: { lun: { from: "8am", to: "10:00" } } })));
    await assertFails(setDoc(doc(db, path), good(CAROL, { days: { lun: { from: "25:00", to: "10:00" } } })));
    await assertFails(setDoc(doc(db, path), good(CAROL, { days: { lun: { from: "10:00", to: "10:00" } } })));
    await assertFails(setDoc(doc(db, path), good(CAROL, { updatedBy: ADMIN.email })));
    await assertFails(setDoc(doc(db, path), good(CAROL, { note: "x".repeat(201) })));
  });
  test("owner or admin can remove a row", async () => {
    await setDoc(doc(as(CAROL).firestore(), `availability/${CAROL.name}`), good(CAROL));
    await assertSucceeds(deleteDoc(doc(as(ADMIN).firestore(), `availability/${CAROL.name}`)));
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
