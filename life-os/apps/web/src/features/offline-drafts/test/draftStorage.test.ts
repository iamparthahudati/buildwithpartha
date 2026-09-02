import { beforeEach, describe, expect, it, vitest } from "vitest";
import {
  buildDraftStorageKey,
  clearAllDrafts,
  clearUserDrafts,
  decryptPayload,
  deleteDraft,
  encryptPayload,
  isDraftExpired,
  listUserDrafts,
  readDraft,
  saveDraft,
} from "../model/draftStorage";

describe("draftStorage model (LOS-1312)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds user-namespaced storage keys", () => {
    const key = buildDraftStorageKey("user-123", "note-456");
    expect(key).toBe("lifeos.drafts.user-123.note-456");
  });

  it("encrypts and decrypts payloads per user", () => {
    const original = "Sensitive note draft content";
    const encrypted = encryptPayload(original, "user-123");
    expect(encrypted).not.toBe(original);
    expect(encrypted).not.toContain("Sensitive");

    const decrypted = decryptPayload(encrypted, "user-123");
    expect(decrypted).toBe(original);
  });

  it("fails decryption with wrong user key", () => {
    const original = "Secret text";
    const encrypted = encryptPayload(original, "user-123");
    const decryptedWrongUser = decryptPayload(encrypted, "user-456");
    expect(decryptedWrongUser).not.toBe(original);
  });

  it("saves and reads a user-scoped draft", () => {
    const draftData = { title: "Draft Title", body: "Draft Body" };
    const saved = saveDraft("user-1", "form-1", draftData);
    expect(saved).not.toBeNull();
    expect(saved?.key).toBe("form-1");
    expect(saved?.userId).toBe("user-1");
    expect(saved?.data).toEqual(draftData);

    const loaded = readDraft<{ title: string; body: string }>("user-1", "form-1");
    expect(loaded).not.toBeNull();
    expect(loaded?.data).toEqual(draftData);
  });

  it("enforces user isolation", () => {
    saveDraft("user-a", "shared-key", "User A Secret");
    const readUserB = readDraft("user-b", "shared-key");
    expect(readUserB).toBeNull();
  });

  it("handles expired drafts automatically", () => {
    // Save draft expired 1 day ago
    const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredDraft = {
      expiresAt: pastTime,
    };
    expect(isDraftExpired(expiredDraft)).toBe(true);

    saveDraft("user-1", "expiring-key", { text: "old" }, { expiresInDays: -1 });
    const readExpired = readDraft("user-1", "expiring-key");
    expect(readExpired).toBeNull();

    // Verify storage item was pruned
    expect(window.localStorage.getItem(buildDraftStorageKey("user-1", "expiring-key"))).toBeNull();
  });

  it("deletes a draft", () => {
    saveDraft("user-1", "key-to-delete", "data");
    expect(readDraft("user-1", "key-to-delete")).not.toBeNull();

    deleteDraft("user-1", "key-to-delete");
    expect(readDraft("user-1", "key-to-delete")).toBeNull();
  });

  it("lists all non-expired drafts for a user", () => {
    saveDraft("user-1", "draft-1", "data-1");
    saveDraft("user-1", "draft-2", "data-2");
    saveDraft("user-2", "draft-3", "data-3");

    const user1Drafts = listUserDrafts("user-1");
    expect(user1Drafts).toHaveLength(2);
    expect(user1Drafts.map((d) => d.key)).toEqual(expect.arrayContaining(["draft-1", "draft-2"]));
  });

  it("clears user-specific drafts on clearUserDrafts", () => {
    saveDraft("user-1", "draft-1", "data-1");
    saveDraft("user-1", "draft-2", "data-2");
    saveDraft("user-2", "draft-3", "data-3");

    clearUserDrafts("user-1");

    expect(readDraft("user-1", "draft-1")).toBeNull();
    expect(readDraft("user-1", "draft-2")).toBeNull();
    expect(readDraft("user-2", "draft-3")).not.toBeNull();
  });

  it("clears all drafts on clearAllDrafts", () => {
    saveDraft("user-1", "draft-1", "data-1");
    saveDraft("user-2", "draft-2", "data-2");

    clearAllDrafts();

    expect(readDraft("user-1", "draft-1")).toBeNull();
    expect(readDraft("user-2", "draft-2")).toBeNull();
  });

  it("rejects saving drafts that exceed max single draft limit", () => {
    const hugeString = "a".repeat(300 * 1024); // 300KB
    const saved = saveDraft("user-1", "huge-draft", hugeString);
    expect(saved).toBeNull();
  });

  it("handles storage write errors gracefully", () => {
    saveDraft("user-1", "key-1", "value-1");

    // Mock storage setItem to throw QuotaExceededError once
    const setItemSpy = vitest.spyOn(Storage.prototype, "setItem");
    setItemSpy.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });

    const result = saveDraft("user-1", "key-2", "value-2");
    // Should evict key-1 and retry write
    expect(result).not.toBeNull();

    setItemSpy.mockRestore();
  });
});
