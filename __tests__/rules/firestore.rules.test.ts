/**
 * Firestore Security Rules Tests
 *
 * Run with:
 *   firebase emulators:exec --only firestore 'npx jest __tests__/rules/'
 *
 * Or via the npm script:
 *   npm run test:rules
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "trackeeper-rules-test";

let testEnv: RulesTestEnvironment;

// ── Helper: seed a user profile into Firestore so getUserRole() works ──
async function seedUserProfile(
  uid: string,
  data: { email: string; name: string; role: string },
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", uid), { uid, ...data });
  });
}

// ── Helper: seed a request document ──
async function seedRequest(
  requestId: string,
  data: Record<string, unknown>,
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "requests", requestId), data);
  });
}

// ── Helper: get an authenticated Firestore instance ──
function authedDb(uid: string, email = `${uid}@test.com`) {
  return testEnv
    .authenticatedContext(uid, { email })
    .firestore();
}

function unauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

// ── Setup / Teardown ──
beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, "../../firestore.rules");
  const rules = fs.readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ═══════════════════════════════════════════════════════════════════════
// 1. Users Collection
// ═══════════════════════════════════════════════════════════════════════
describe("Users collection", () => {
  describe("read", () => {
    it("allows authenticated user to read any user profile", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("reader1", "reader1@test.com");
      await assertSucceeds(getDoc(doc(db, "users", "user1")));
    });

    it("denies unauthenticated read", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = unauthDb();
      await assertFails(getDoc(doc(db, "users", "user1")));
    });
  });

  describe("create", () => {
    it("allows user to create their own profile with required fields", async () => {
      const db = authedDb("newuser", "newuser@test.com");
      await assertSucceeds(
        setDoc(doc(db, "users", "newuser"), {
          uid: "newuser",
          email: "newuser@test.com",
          name: "New User",
          role: "tenant",
        }),
      );
    });

    it("denies creating profile with maintainer role (privileged, requires admin provisioning)", async () => {
      const db = authedDb("maint1", "maint1@test.com");
      await assertFails(
        setDoc(doc(db, "users", "maint1"), {
          uid: "maint1",
          email: "maint1@test.com",
          name: "Maintainer",
          role: "maintainer",
        }),
      );
    });

    it("denies creating profile with manager role (privileged, requires admin provisioning)", async () => {
      const db = authedDb("mgr1", "mgr1@test.com");
      await assertFails(
        setDoc(doc(db, "users", "mgr1"), {
          uid: "mgr1",
          email: "mgr1@test.com",
          name: "Manager",
          role: "manager",
        }),
      );
    });

    it("denies creating profile with mismatched uid", async () => {
      const db = authedDb("attacker", "attacker@test.com");
      await assertFails(
        setDoc(doc(db, "users", "victim"), {
          uid: "victim",
          email: "attacker@test.com",
          name: "Attacker",
          role: "tenant",
        }),
      );
    });

    it("denies creating profile with mismatched uid field", async () => {
      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(doc(db, "users", "user1"), {
          uid: "different-uid",
          email: "user1@test.com",
          name: "User",
          role: "tenant",
        }),
      );
    });

    it("denies creating profile with mismatched email", async () => {
      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(doc(db, "users", "user1"), {
          uid: "user1",
          email: "wrong@test.com",
          name: "User",
          role: "tenant",
        }),
      );
    });

    it("denies creating profile with invalid role", async () => {
      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(doc(db, "users", "user1"), {
          uid: "user1",
          email: "user1@test.com",
          name: "User",
          role: "admin",
        }),
      );
    });

    it("denies creating profile missing required fields", async () => {
      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(doc(db, "users", "user1"), {
          uid: "user1",
          email: "user1@test.com",
          // missing name and role
        }),
      );
    });
  });

  describe("update", () => {
    it("allows user to update own profile without changing role", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("user1", "user1@test.com");
      await assertSucceeds(
        setDoc(
          doc(db, "users", "user1"),
          {
            uid: "user1",
            email: "user1@test.com",
            name: "Updated Name",
            role: "tenant",
          },
        ),
      );
    });

    it("denies user changing their role on update", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(
          doc(db, "users", "user1"),
          {
            uid: "user1",
            email: "user1@test.com",
            name: "User One",
            role: "manager",
          },
        ),
      );
    });

    it("denies user changing their uid on update", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(
          doc(db, "users", "user1"),
          {
            uid: "changed-uid",
            email: "user1@test.com",
            name: "User One",
            role: "tenant",
          },
        ),
      );
    });

    it("denies user changing their email on update", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("user1", "user1@test.com");
      await assertFails(
        setDoc(
          doc(db, "users", "user1"),
          {
            uid: "user1",
            email: "hacked@test.com",
            name: "User One",
            role: "tenant",
          },
        ),
      );
    });

    it("denies other user updating someone else's profile", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("attacker", "attacker@test.com");
      await assertFails(
        setDoc(
          doc(db, "users", "user1"),
          {
            uid: "user1",
            email: "user1@test.com",
            name: "Hacked",
            role: "tenant",
          },
        ),
      );
    });
  });

  describe("delete", () => {
    it("denies any user from deleting profiles", async () => {
      await seedUserProfile("user1", {
        email: "user1@test.com",
        name: "User One",
        role: "tenant",
      });

      const db = authedDb("user1", "user1@test.com");
      await assertFails(deleteDoc(doc(db, "users", "user1")));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Requests Collection
// ═══════════════════════════════════════════════════════════════════════
describe("Requests collection", () => {
  const tenantId = "tenant1";
  const managerId = "manager1";
  const maintainerId = "maint1";
  const otherTenantId = "tenant2";

  beforeEach(async () => {
    // Seed user profiles so getUserRole() resolves
    await seedUserProfile(tenantId, {
      email: "tenant1@test.com",
      name: "Tenant One",
      role: "tenant",
    });
    await seedUserProfile(managerId, {
      email: "manager1@test.com",
      name: "Manager One",
      role: "manager",
    });
    await seedUserProfile(maintainerId, {
      email: "maint1@test.com",
      name: "Maintainer One",
      role: "maintainer",
    });
    await seedUserProfile(otherTenantId, {
      email: "tenant2@test.com",
      name: "Tenant Two",
      role: "tenant",
    });
  });

  const validRequest = {
    title: "Fix faucet",
    description: "The kitchen faucet is leaking badly",
    category: "Plumbing",
    priority: "high",
    status: "submitted",
    tenantId: tenantId,
    tenantName: "Tenant One",
    statusHistory: [],
    createdAt: serverTimestamp(),
    clientTimestamp: Date.now(),
    imageUrl: null,
  };

  describe("create", () => {
    it("allows tenant to create request with correct ownership", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertSucceeds(
        addDoc(collection(db, "requests"), validRequest),
      );
    });

    it("denies tenant creating request for another user", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests"), {
          ...validRequest,
          tenantId: otherTenantId,
          tenantName: "Tenant Two",
        }),
      );
    });

    it("denies request with wrong status", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests"), {
          ...validRequest,
          status: "completed",
        }),
      );
    });

    it("denies request missing required fields", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests"), {
          title: "Fix faucet",
          tenantId: tenantId,
          status: "submitted",
          // missing description, category, priority, tenantName
        }),
      );
    });

    it("denies manager from creating requests", async () => {
      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(
        addDoc(collection(db, "requests"), {
          ...validRequest,
          tenantId: managerId,
          tenantName: "Manager One",
        }),
      );
    });

    it("denies maintainer from creating requests", async () => {
      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        addDoc(collection(db, "requests"), {
          ...validRequest,
          tenantId: maintainerId,
          tenantName: "Maintainer One",
        }),
      );
    });
  });

  describe("read", () => {
    it("allows manager to read all requests", async () => {
      await seedRequest("req1", {
        ...validRequest,
        assignedTo: maintainerId,
      });

      const db = authedDb(managerId, "manager1@test.com");
      await assertSucceeds(getDoc(doc(db, "requests", "req1")));
    });

    it("allows tenant to read own request", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertSucceeds(getDoc(doc(db, "requests", "req1")));
    });

    it("denies tenant reading another tenant's request", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(otherTenantId, "tenant2@test.com");
      await assertFails(getDoc(doc(db, "requests", "req1")));
    });

    it("allows maintainer to read assigned request", async () => {
      await seedRequest("req1", {
        ...validRequest,
        assignedTo: maintainerId,
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertSucceeds(getDoc(doc(db, "requests", "req1")));
    });

    it("denies maintainer reading unassigned request", async () => {
      await seedRequest("req1", {
        ...validRequest,
        assignedTo: "someone-else",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(getDoc(doc(db, "requests", "req1")));
    });

    it("denies unauthenticated read", async () => {
      await seedRequest("req1", validRequest);

      const db = unauthDb();
      await assertFails(getDoc(doc(db, "requests", "req1")));
    });
  });

  describe("update", () => {
    it("allows manager to update any request (preserving tenant fields)", async () => {
      await seedRequest("req1", { ...validRequest, createdAt: serverTimestamp() });

      const db = authedDb(managerId, "manager1@test.com");
      await assertSucceeds(
        updateDoc(doc(db, "requests", "req1"), {
          status: "assigned",
          assignedTo: maintainerId,
          assignedToName: "Maintainer One",
        }),
      );
    });

    it("allows tenant to update own request without changing ownership", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertSucceeds(
        updateDoc(doc(db, "requests", "req1"), {
          description: "Updated description",
          tenantId: tenantId,
          tenantName: "Tenant One",
        }),
      );
    });

    it("denies tenant changing tenantId on own request", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          tenantId: "someone-else",
          tenantName: "Tenant One",
        }),
      );
    });

    it("denies tenant changing tenantName on own request", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          tenantId: tenantId,
          tenantName: "Fake Name",
        }),
      );
    });

    it("allows maintainer assigned->in_progress transition", async () => {
      await seedRequest("req1", {
        ...validRequest,
        status: "assigned",
        assignedTo: maintainerId,
        assignedToName: "Maintainer One",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertSucceeds(
        updateDoc(doc(db, "requests", "req1"), {
          status: "in_progress",
          tenantId: tenantId,
          tenantName: "Tenant One",
          assignedTo: maintainerId,
          assignedToName: "Maintainer One",
        }),
      );
    });

    it("allows maintainer in_progress->completed transition", async () => {
      await seedRequest("req1", {
        ...validRequest,
        status: "in_progress",
        assignedTo: maintainerId,
        assignedToName: "Maintainer One",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertSucceeds(
        updateDoc(doc(db, "requests", "req1"), {
          status: "completed",
          tenantId: tenantId,
          tenantName: "Tenant One",
          assignedTo: maintainerId,
          assignedToName: "Maintainer One",
        }),
      );
    });

    it("denies maintainer invalid transition assigned->completed", async () => {
      await seedRequest("req1", {
        ...validRequest,
        status: "assigned",
        assignedTo: maintainerId,
        assignedToName: "Maintainer One",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          status: "completed",
          tenantId: tenantId,
          tenantName: "Tenant One",
          assignedTo: maintainerId,
          assignedToName: "Maintainer One",
        }),
      );
    });

    it("denies maintainer invalid transition in_progress->submitted", async () => {
      await seedRequest("req1", {
        ...validRequest,
        status: "in_progress",
        assignedTo: maintainerId,
        assignedToName: "Maintainer One",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          status: "submitted",
          tenantId: tenantId,
          tenantName: "Tenant One",
          assignedTo: maintainerId,
          assignedToName: "Maintainer One",
        }),
      );
    });

    it("denies maintainer changing tenantId on assigned request", async () => {
      await seedRequest("req1", {
        ...validRequest,
        status: "assigned",
        assignedTo: maintainerId,
        assignedToName: "Maintainer One",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          tenantId: "hijacked",
          tenantName: "Tenant One",
          assignedTo: maintainerId,
          assignedToName: "Maintainer One",
          status: "in_progress",
        }),
      );
    });

    it("denies maintainer changing assignedTo on assigned request", async () => {
      await seedRequest("req1", {
        ...validRequest,
        status: "assigned",
        assignedTo: maintainerId,
        assignedToName: "Maintainer One",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          tenantId: tenantId,
          tenantName: "Tenant One",
          assignedTo: "someone-else",
          assignedToName: "Maintainer One",
          status: "in_progress",
        }),
      );
    });

    it("denies maintainer updating unassigned request", async () => {
      await seedRequest("req1", {
        ...validRequest,
        assignedTo: "someone-else",
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          status: "in_progress",
        }),
      );
    });

    it("denies other tenant updating request they do not own", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(otherTenantId, "tenant2@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", "req1"), {
          description: "Hijacked",
          tenantId: tenantId,
          tenantName: "Tenant One",
        }),
      );
    });
  });

  describe("delete", () => {
    it("denies deleting requests", async () => {
      await seedRequest("req1", validRequest);

      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(deleteDoc(doc(db, "requests", "req1")));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Messages Subcollection
// ═══════════════════════════════════════════════════════════════════════
describe("Messages subcollection", () => {
  const tenantId = "tenant1";
  const managerId = "manager1";
  const maintainerId = "maint1";
  const outsiderId = "outsider1";
  const requestId = "req-msg-test";

  beforeEach(async () => {
    await seedUserProfile(tenantId, {
      email: "tenant1@test.com",
      name: "Tenant One",
      role: "tenant",
    });
    await seedUserProfile(managerId, {
      email: "manager1@test.com",
      name: "Manager One",
      role: "manager",
    });
    await seedUserProfile(maintainerId, {
      email: "maint1@test.com",
      name: "Maintainer One",
      role: "maintainer",
    });
    await seedUserProfile(outsiderId, {
      email: "outsider1@test.com",
      name: "Outsider",
      role: "tenant",
    });

    await seedRequest(requestId, {
      title: "Test request",
      description: "For message tests",
      category: "general",
      priority: "medium",
      status: "in_progress",
      tenantId: tenantId,
      tenantName: "Tenant One",
      assignedTo: maintainerId,
    });
  });

  const validMessage = {
    senderId: tenantId,
    senderName: "Tenant One",
    text: "Hello, when will this be fixed?",
    createdAt: serverTimestamp(),
  };

  describe("read", () => {
    it("allows tenant (request owner) to read messages", async () => {
      // Seed a message
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "Hello",
          createdAt: new Date(),
        });
      });

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertSucceeds(
        getDoc(doc(db, "requests", requestId, "messages", "msg1")),
      );
    });

    it("allows manager to read messages", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "Hello",
          createdAt: new Date(),
        });
      });

      const db = authedDb(managerId, "manager1@test.com");
      await assertSucceeds(
        getDoc(doc(db, "requests", requestId, "messages", "msg1")),
      );
    });

    it("allows assigned maintainer to read messages", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "Hello",
          createdAt: new Date(),
        });
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertSucceeds(
        getDoc(doc(db, "requests", requestId, "messages", "msg1")),
      );
    });

    it("denies non-participant from reading messages", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "Hello",
          createdAt: new Date(),
        });
      });

      const db = authedDb(outsiderId, "outsider1@test.com");
      await assertFails(
        getDoc(doc(db, "requests", requestId, "messages", "msg1")),
      );
    });
  });

  describe("create", () => {
    it("allows tenant to send message with correct sender identity", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertSucceeds(
        addDoc(collection(db, "requests", requestId, "messages"), validMessage),
      );
    });

    it("allows manager to send message", async () => {
      const db = authedDb(managerId, "manager1@test.com");
      await assertSucceeds(
        addDoc(collection(db, "requests", requestId, "messages"), {
          senderId: managerId,
          senderName: "Manager One",
          text: "We will look into it.",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("allows assigned maintainer to send message", async () => {
      const db = authedDb(maintainerId, "maint1@test.com");
      await assertSucceeds(
        addDoc(collection(db, "requests", requestId, "messages"), {
          senderId: maintainerId,
          senderName: "Maintainer One",
          text: "On my way.",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies message with mismatched senderId", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "messages"), {
          senderId: "someone-else",
          senderName: "Fake",
          text: "Impersonation attempt",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies message missing required fields", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "messages"), {
          senderId: tenantId,
          text: "Missing senderName and createdAt",
        }),
      );
    });

    it("denies message with empty text", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "messages"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies non-participant from sending messages", async () => {
      const db = authedDb(outsiderId, "outsider1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "messages"), {
          senderId: outsiderId,
          senderName: "Outsider",
          text: "I should not be able to post here",
          createdAt: serverTimestamp(),
        }),
      );
    });
  });

  describe("update", () => {
    it("denies updating messages", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "Original",
          createdAt: new Date(),
        });
      });

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          text: "Edited",
        }),
      );
    });
  });

  describe("delete", () => {
    it("denies deleting messages", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "messages", "msg1"), {
          senderId: tenantId,
          senderName: "Tenant One",
          text: "Original",
          createdAt: new Date(),
        });
      });

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        deleteDoc(doc(db, "requests", requestId, "messages", "msg1")),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Notes Subcollection (manager only)
// ═══════════════════════════════════════════════════════════════════════
describe("Notes subcollection", () => {
  const tenantId = "tenant1";
  const managerId = "manager1";
  const maintainerId = "maint1";
  const requestId = "req-notes-test";

  beforeEach(async () => {
    await seedUserProfile(tenantId, {
      email: "tenant1@test.com",
      name: "Tenant One",
      role: "tenant",
    });
    await seedUserProfile(managerId, {
      email: "manager1@test.com",
      name: "Manager One",
      role: "manager",
    });
    await seedUserProfile(maintainerId, {
      email: "maint1@test.com",
      name: "Maintainer One",
      role: "maintainer",
    });

    await seedRequest(requestId, {
      title: "Test request",
      description: "For notes tests",
      category: "general",
      priority: "medium",
      status: "in_progress",
      tenantId: tenantId,
      tenantName: "Tenant One",
      assignedTo: maintainerId,
    });
  });

  describe("read", () => {
    it("allows manager to read notes", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "notes", "note1"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "Internal note",
          createdAt: new Date(),
        });
      });

      const db = authedDb(managerId, "manager1@test.com");
      await assertSucceeds(
        getDoc(doc(db, "requests", requestId, "notes", "note1")),
      );
    });

    it("denies tenant from reading notes", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "notes", "note1"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "Internal note",
          createdAt: new Date(),
        });
      });

      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        getDoc(doc(db, "requests", requestId, "notes", "note1")),
      );
    });

    it("denies maintainer from reading notes", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "notes", "note1"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "Internal note",
          createdAt: new Date(),
        });
      });

      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        getDoc(doc(db, "requests", requestId, "notes", "note1")),
      );
    });
  });

  describe("create", () => {
    it("allows manager to create note with correct author identity", async () => {
      const db = authedDb(managerId, "manager1@test.com");
      await assertSucceeds(
        addDoc(collection(db, "requests", requestId, "notes"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "Internal observation",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies note with mismatched managerId", async () => {
      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "notes"), {
          managerId: "someone-else",
          managerName: "Fake",
          text: "Impersonation",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies note missing required fields", async () => {
      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "notes"), {
          managerId: managerId,
          text: "Missing managerName and createdAt",
        }),
      );
    });

    it("denies note with empty text", async () => {
      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "notes"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies tenant from creating notes", async () => {
      const db = authedDb(tenantId, "tenant1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "notes"), {
          managerId: tenantId,
          managerName: "Tenant One",
          text: "Tenant should not create notes",
          createdAt: serverTimestamp(),
        }),
      );
    });

    it("denies maintainer from creating notes", async () => {
      const db = authedDb(maintainerId, "maint1@test.com");
      await assertFails(
        addDoc(collection(db, "requests", requestId, "notes"), {
          managerId: maintainerId,
          managerName: "Maintainer One",
          text: "Maintainer should not create notes",
          createdAt: serverTimestamp(),
        }),
      );
    });
  });

  describe("update", () => {
    it("denies updating notes", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "notes", "note1"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "Original note",
          createdAt: new Date(),
        });
      });

      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(
        updateDoc(doc(db, "requests", requestId, "notes", "note1"), {
          text: "Edited note",
        }),
      );
    });
  });

  describe("delete", () => {
    it("denies deleting notes", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, "requests", requestId, "notes", "note1"), {
          managerId: managerId,
          managerName: "Manager One",
          text: "Original note",
          createdAt: new Date(),
        });
      });

      const db = authedDb(managerId, "manager1@test.com");
      await assertFails(
        deleteDoc(doc(db, "requests", requestId, "notes", "note1")),
      );
    });
  });
});
