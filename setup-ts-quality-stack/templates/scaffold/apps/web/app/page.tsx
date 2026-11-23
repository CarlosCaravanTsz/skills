import { allocate } from "@org/core"
import { Button } from "@org/ui/button"

export default function HomePage() {
  const parts = allocate({ totalCents: 100, weights: [1, 1, 1] })
  return (
    <main>
      <p>100 cents in three parts: {parts.join(" / ")}</p>
      <Button tone="primary">Split again</Button>
    </main>
  )
}
