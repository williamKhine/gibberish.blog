/** Serializes draft writes and preserves the last acknowledged revision on failure. */
export class DraftSaver<T> {
  private pending: Promise<void> | null = null
  private acknowledged: string
  constructor(
    public revision: number,
    initial: T,
    private read: () => T,
    private persist: (value: T, revision: number) => Promise<number>,
    private notify: (status: "saving" | "saved" | "failed") => void
  ) {
    this.acknowledged = JSON.stringify(initial)
  }
  get dirty() {
    return JSON.stringify(this.read()) !== this.acknowledged
  }
  flush(): Promise<void> {
    if (this.pending) return this.pending
    const work = async () => {
      while (this.dirty) {
        const snapshot = this.read()
        const encoded = JSON.stringify(snapshot)
        this.notify("saving")
        try {
          const next = await this.persist(snapshot, this.revision)
          this.revision = next
          this.acknowledged = encoded
        } catch (error) {
          this.notify("failed")
          throw error
        }
      }
      this.notify("saved")
    }
    this.pending = work().finally(() => {
      this.pending = null
    })
    return this.pending
  }
}
