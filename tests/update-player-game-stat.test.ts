import { beforeEach, describe, expect, it, vi } from "vitest";
import { playerGameStatRevisions, playerGameStats } from "@/db/schema";

type SelectBuilder = {
  from: (table: unknown) => SelectBuilder;
  innerJoin: (table: unknown, on: unknown) => SelectBuilder;
  where: (condition: unknown) => SelectBuilder;
  orderBy: (...args: unknown[]) => SelectBuilder;
  limit: (count: number) => Promise<unknown[]>;
};

type WriteBuilder = {
  where: (condition: unknown) => Promise<void>;
};

type UpdateBuilder = WriteBuilder & {
  set: (payload: unknown) => WriteBuilder;
};

const mocks = vi.hoisted(() => {
  const state = {
    selectResults: [] as unknown[][],
    updateCalls: [] as Array<{ table: unknown; payload?: unknown; condition?: unknown }>,
    insertCalls: [] as Array<{ table: unknown; payload?: unknown }>,
    deleteCalls: [] as Array<{ table: unknown; condition?: unknown }>,
  };

  function createSelectBuilder(result: unknown[]) {
    const builder = {} as SelectBuilder;
    builder.from = vi.fn(() => builder);
    builder.innerJoin = vi.fn(() => builder);
    builder.where = vi.fn(() => builder);
    builder.orderBy = vi.fn(() => builder);
    builder.limit = vi.fn(async () => result);
    return builder;
  }

  const db = {
    select: vi.fn(() => createSelectBuilder(state.selectResults.shift() ?? [])),
    update: vi.fn((table: unknown) => {
      const call = { table, payload: undefined as unknown, condition: undefined as unknown };
      state.updateCalls.push(call);
      const builder = {} as UpdateBuilder;
      builder.set = vi.fn((payload: unknown) => {
        call.payload = payload;
        return builder;
      });
      builder.where = vi.fn(async (condition: unknown) => {
        call.condition = condition;
      });
      return builder;
    }),
    insert: vi.fn((table: unknown) => {
      const call = { table, payload: undefined as unknown };
      state.insertCalls.push(call);
      return {
        values: vi.fn(async (payload: unknown) => {
          call.payload = payload;
        }),
      };
    }),
    delete: vi.fn((table: unknown) => {
      const call = { table, condition: undefined as unknown };
      state.deleteCalls.push(call);
      return {
        where: vi.fn(async (condition: unknown) => {
          call.condition = condition;
        }),
      };
    }),
  };

  const redirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
  const revalidatePath = vi.fn();
  const requireAdmin = vi.fn(async () => ({ id: "admin-user", role: "admin" }));

  return { state, db, redirect, revalidatePath, requireAdmin };
});

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const { revertPlayerGameStatEdit, updatePlayerGameStat } = await import("@/app/actions/games");

function baseStat(overrides: Partial<typeof playerGameStats.$inferSelect> = {}) {
  return {
    id: "stat-1",
    gameId: "game-1",
    playerId: "player-old",
    minutes: 14,
    points: 8,
    fgMade: 3,
    fgAtt: 6,
    twoMade: 2,
    twoAtt: 4,
    threeMade: 1,
    threeAtt: 2,
    ftMade: 1,
    ftAtt: 1,
    offReb: 1,
    defReb: 4,
    assists: 2,
    steals: 1,
    blocks: 0,
    turnovers: 2,
    fouls: 3,
    plusMinus: 5,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function currentStatRow(overrides: Partial<typeof playerGameStats.$inferSelect> = {}) {
  return {
    stat: baseStat(overrides),
    game: { id: "game-1", ownerUserId: "owner-1" },
  };
}

beforeEach(() => {
  mocks.state.selectResults.length = 0;
  mocks.state.updateCalls.length = 0;
  mocks.state.insertCalls.length = 0;
  mocks.state.deleteCalls.length = 0;
  vi.clearAllMocks();
});

describe("updatePlayerGameStat", () => {
  it("stores a reversible snapshot and updates the stat in place", async () => {
    mocks.state.selectResults.push(
      [currentStatRow()],
      [{ id: "player-new", ownerUserId: "owner-1" }],
    );

    const formData = new FormData();
    formData.set("playerGameStatId", "stat-1");
    formData.set("playerId", "player-new");
    formData.set("minutes", "18");
    formData.set("points", "11");
    formData.set("plusMinus", "-2");

    await expect(updatePlayerGameStat(formData)).rejects.toThrow("REDIRECT:/partidos/game-1?message=stat-updated");

    expect(mocks.state.deleteCalls[0]).toMatchObject({ table: playerGameStatRevisions });
    expect(mocks.state.insertCalls[0]).toMatchObject({ table: playerGameStatRevisions });
    expect(mocks.state.insertCalls[0].payload).toMatchObject({
      playerGameStatId: "stat-1",
      gameId: "game-1",
      playerId: "player-old",
      editedByUserId: "admin-user",
      snapshot: {
        playerId: "player-old",
        minutes: 14,
        points: 8,
        fgMade: 3,
        fgAtt: 6,
        twoMade: 2,
        twoAtt: 4,
        threeMade: 1,
        threeAtt: 2,
        ftMade: 1,
        ftAtt: 1,
        offReb: 1,
        defReb: 4,
        assists: 2,
        steals: 1,
        blocks: 0,
        turnovers: 2,
        fouls: 3,
        plusMinus: 5,
      },
    });

    expect(mocks.state.updateCalls[0]).toMatchObject({ table: playerGameStats });
    expect(mocks.state.updateCalls[0].payload).toEqual(
      expect.objectContaining({
        playerId: "player-new",
        minutes: 18,
        points: 11,
        fgMade: 3,
        fgAtt: 6,
        plusMinus: -2,
      }),
    );

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/partidos/game-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/partidos");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/reports");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/players/player-old");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/players/player-new");
  });
});

describe("revertPlayerGameStatEdit", () => {
  it("restores the previous snapshot and clears the undo buffer", async () => {
    mocks.state.selectResults.push(
      [currentStatRow({ playerId: "player-new", points: 11, minutes: 18, plusMinus: -2 })],
      [
        {
          id: "revision-1",
          playerGameStatId: "stat-1",
          gameId: "game-1",
          playerId: "player-old",
          editedByUserId: "admin-user",
          snapshot: {
            playerId: "player-old",
            minutes: 14,
            points: 8,
            fgMade: 3,
            fgAtt: 6,
            twoMade: 2,
            twoAtt: 4,
            threeMade: 1,
            threeAtt: 2,
            ftMade: 1,
            ftAtt: 1,
            offReb: 1,
            defReb: 4,
            assists: 2,
            steals: 1,
            blocks: 0,
            turnovers: 2,
            fouls: 3,
            plusMinus: 5,
          },
        },
      ],
    );

    const formData = new FormData();
    formData.set("playerGameStatId", "stat-1");

    await expect(revertPlayerGameStatEdit(formData)).rejects.toThrow("REDIRECT:/partidos/game-1?message=stat-reverted");

    expect(mocks.state.updateCalls[0]).toMatchObject({ table: playerGameStats });
    expect(mocks.state.updateCalls[0].payload).toEqual(
      expect.objectContaining({
        playerId: "player-old",
        minutes: 14,
        points: 8,
        plusMinus: 5,
      }),
    );
    expect(mocks.state.deleteCalls[0]).toMatchObject({ table: playerGameStatRevisions });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/partidos/game-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/players/player-new");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/players/player-old");
  });
});
