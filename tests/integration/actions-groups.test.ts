import { describe, expect, it } from "vitest";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  regenerateInviteCode,
  updateDiscordWebhook,
} from "@/app/(app)/groups/actions";
import { STARTING_TOKENS } from "@/lib/constants";
import {
  actAs,
  actAsGuest,
  captureRedirect,
  formData,
  makeGroup,
  makeUser,
  prisma,
} from "../db";
import { NotFoundError, RedirectError } from "../mocks";

describe("createGroup", () => {
  it("creates the group, makes the caller owner and funds them", async () => {
    const user = await makeUser();
    actAs(user);

    const url = await captureRedirect(() =>
      createGroup(null, formData({ name: "Les Potos", description: "Test" })),
    );

    const group = await prisma.group.findFirstOrThrow({
      include: { members: true },
    });
    expect(url).toBe(`/g/${group.id}`);
    expect(group.ownerId).toBe(user.id);
    expect(group.members).toHaveLength(1);
    expect(group.members[0].tokens).toBe(STARTING_TOKENS);
    expect(group.members[0].karma).toBe(0);
  });

  it("generates a unique invite code per group", async () => {
    const user = await makeUser();
    actAs(user);
    await captureRedirect(() => createGroup(null, formData({ name: "Un" })));
    await captureRedirect(() => createGroup(null, formData({ name: "Deux" })));

    const groups = await prisma.group.findMany();
    expect(new Set(groups.map((g) => g.inviteCode)).size).toBe(2);
  });

  it.each(["", " ", "a"])("rejects the too-short name %j", async (name) => {
    actAs(await makeUser());
    const result = await createGroup(null, formData({ name }));
    expect(result?.error).toBeTruthy();
    expect(await prisma.group.count()).toBe(0);
  });

  it("stores an empty description as null", async () => {
    actAs(await makeUser());
    await captureRedirect(() =>
      createGroup(null, formData({ name: "Sans desc", description: "  " })),
    );
    const group = await prisma.group.findFirstOrThrow();
    expect(group.description).toBeNull();
  });

  it("sends a guest to the login page", async () => {
    actAsGuest();
    await expect(
      createGroup(null, formData({ name: "Anonyme" })),
    ).rejects.toThrow(RedirectError);
    expect(await prisma.group.count()).toBe(0);
  });
});

describe("joinGroup", () => {
  it("adds the caller with a starting balance", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    const newcomer = await makeUser();
    actAs(newcomer);

    const url = await captureRedirect(() =>
      joinGroup(null, formData({ code: group.inviteCode })),
    );

    expect(url).toBe(`/g/${group.id}`);
    const membership = await prisma.groupMember.findUniqueOrThrow({
      where: { groupId_userId: { groupId: group.id, userId: newcomer.id } },
    });
    expect(membership.tokens).toBe(STARTING_TOKENS);
  });

  it("announces the arrival in the activity feed", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(await makeUser({ name: "Nina" }));
    await captureRedirect(() =>
      joinGroup(null, formData({ code: group.inviteCode })),
    );

    const activities = await prisma.activity.findMany({
      where: { groupId: group.id },
    });
    expect(activities.some((a) => a.message.includes("Nina"))).toBe(true);
  });

  it("rejects an unknown code without creating anything", async () => {
    actAs(await makeUser());
    const result = await joinGroup(null, formData({ code: "nope" }));
    expect(result?.error).toBeTruthy();
    expect(await prisma.groupMember.count()).toBe(0);
  });

  it("is idempotent for an existing member", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(owner);

    await captureRedirect(() =>
      joinGroup(null, formData({ code: group.inviteCode })),
    );

    expect(
      await prisma.groupMember.count({ where: { groupId: group.id } }),
    ).toBe(1);
  });

  it("does not re-fund a member who rejoins after spending", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId: group.id, userId: owner.id } },
      data: { tokens: 5 },
    });
    actAs(owner);

    await captureRedirect(() =>
      joinGroup(null, formData({ code: group.inviteCode })),
    );

    const membership = await prisma.groupMember.findUniqueOrThrow({
      where: { groupId_userId: { groupId: group.id, userId: owner.id } },
    });
    expect(membership.tokens).toBe(5);
  });
});

describe("regenerateInviteCode", () => {
  it("lets the owner rotate the code", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(owner);

    await regenerateInviteCode(group.id);

    const updated = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
    });
    expect(updated.inviteCode).not.toBe(group.inviteCode);
  });

  it("does nothing for a plain member", async () => {
    const owner = await makeUser();
    const member = await makeUser();
    const group = await makeGroup(owner.id, { memberIds: [member.id] });
    actAs(member);

    await regenerateInviteCode(group.id);

    const untouched = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
    });
    expect(untouched.inviteCode).toBe(group.inviteCode);
  });

  it("hides the group from a non-member", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(await makeUser());

    await expect(regenerateInviteCode(group.id)).rejects.toThrow(NotFoundError);
  });
});

describe("updateDiscordWebhook", () => {
  it("stores a Discord webhook URL", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(owner);

    const url = "https://discord.com/api/webhooks/123/abc";
    const result = await updateDiscordWebhook(
      group.id,
      null,
      formData({ webhookUrl: url }),
    );

    expect(result).toBeNull();
    const updated = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
    });
    expect(updated.discordWebhookUrl).toBe(url);
  });

  it("clears the webhook when submitted empty", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id, {
      webhook: "https://discord.com/api/webhooks/1/x",
    });
    actAs(owner);

    await updateDiscordWebhook(group.id, null, formData({ webhookUrl: "" }));

    const updated = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
    });
    expect(updated.discordWebhookUrl).toBeNull();
  });

  it.each([
    "https://evil.example.com/webhook",
    "http://discord.com/api/webhooks/1/x",
    "javascript:alert(1)",
    "discord.com/api/webhooks/1/x",
  ])("refuses %j", async (webhookUrl) => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(owner);

    const result = await updateDiscordWebhook(
      group.id,
      null,
      formData({ webhookUrl }),
    );

    expect(result?.error).toBeTruthy();
    const untouched = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
    });
    expect(untouched.discordWebhookUrl).toBeNull();
  });

  it("refuses a plain member", async () => {
    const owner = await makeUser();
    const member = await makeUser();
    const group = await makeGroup(owner.id, { memberIds: [member.id] });
    actAs(member);

    const result = await updateDiscordWebhook(
      group.id,
      null,
      formData({ webhookUrl: "https://discord.com/api/webhooks/1/x" }),
    );

    expect(result?.error).toBeTruthy();
  });
});

describe("leaveGroup", () => {
  it("removes a plain member", async () => {
    const owner = await makeUser();
    const member = await makeUser();
    const group = await makeGroup(owner.id, { memberIds: [member.id] });
    actAs(member);

    await captureRedirect(() => leaveGroup(group.id));

    expect(
      await prisma.groupMember.count({ where: { groupId: group.id } }),
    ).toBe(1);
  });

  it("refuses to let the owner orphan the group", async () => {
    const owner = await makeUser();
    const group = await makeGroup(owner.id);
    actAs(owner);

    await leaveGroup(group.id);

    expect(
      await prisma.groupMember.count({ where: { groupId: group.id } }),
    ).toBe(1);
  });
});
