import { expect, it, vi } from "vitest"
import { DraftSaver } from "../lib/autosave"
it("retains dirty content and revision on network failure, then retries", async () => {
  let value = { body: "old" }
  const persist = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(3)
  const states: string[] = []
  const saver = new DraftSaver(
    2,
    value,
    () => value,
    persist,
    (s) => states.push(s)
  )
  value = { body: "new words" }
  await expect(saver.flush()).rejects.toThrow("offline")
  expect(value.body).toBe("new words")
  expect(saver.revision).toBe(2)
  expect(saver.dirty).toBe(true)
  await saver.flush()
  expect(persist).toHaveBeenLastCalledWith(value, 2)
  expect(saver.revision).toBe(3)
  expect(saver.dirty).toBe(false)
  expect(states).toEqual(["saving", "failed", "saving", "saved"])
})
it("serializes simultaneous save and publish flushes, including typing during save", async () => {
  let value = { body: "old" }
  let resolve!: (revision: number) => void
  const persist = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<number>((r) => {
          resolve = r
        })
    )
    .mockResolvedValueOnce(2)
  const saver = new DraftSaver(
    0,
    value,
    () => value,
    persist,
    () => {}
  )
  value = { body: "first" }
  const a = saver.flush()
  value = { body: "second" }
  const b = saver.flush()
  expect(a).toBe(b)
  expect(persist).toHaveBeenCalledTimes(1)
  resolve(1)
  await Promise.all([a, b])
  expect(persist).toHaveBeenCalledTimes(2)
  expect(persist).toHaveBeenLastCalledWith({ body: "second" }, 1)
  expect(saver.revision).toBe(2)
  expect(saver.dirty).toBe(false)
})
it("does not overwrite content after a conflicting server revision", async () => {
  let value = "old"
  const saver = new DraftSaver(
    0,
    value,
    () => value,
    async () => {
      throw new Error("another tab")
    },
    () => {}
  )
  value = "keep these words"
  await expect(saver.flush()).rejects.toThrow("another tab")
  expect(saver.dirty).toBe(true)
  expect(saver.revision).toBe(0)
  expect(value).toBe("keep these words")
})
