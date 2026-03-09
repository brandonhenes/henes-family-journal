export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { query, moments } = req.body;
  if (!query || !moments) return res.status(400).json({ error: "Missing query or moments" });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Anthropic key not configured" });

  const momentList = moments.map((m, i) =>
    `[${m.id}] ${m.kid} | ${m.type} | "${m.text}" | by ${m.author} | ${new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  ).join("\n");

  const prompt = `You are searching a family memory journal for the Henes family.
Brandon and Jacky have two daughters: Gabby (born August 2024) and Madalyn (due July 2026).

Here are all the moments in the journal:
${momentList}

The user is searching for: "${query}"

Return ONLY a JSON array of the moment IDs that match this search, ordered by relevance.
Match broadly. If the user says "singing" match any moment about songs, music, nursery rhymes.
If the user says "firsts" match any First-type moments or moments describing something happening for the first time.
If nothing matches, return an empty array.

JSON array only, no explanation:`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const ids = JSON.parse(cleaned);

    return res.status(200).json({ ids });
  } catch (e) {
    console.error("AI search error:", e);
    return res.status(500).json({ error: "AI search failed" });
  }
}
