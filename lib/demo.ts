import { EMPTY_BODY } from "./content"
export type PublicAuthor = {
  _id: string
  handle: string
  name: string
  bio: string
  accent: string
  sticker: string
  avatar?: string
  cover?: string
}
export type PublicPost = {
  _id: string
  title: string
  body: string
  excerpt: string
  tags: string[]
  slug: string
  publishedAt: number
  commentsClosed: boolean
  cover?: string
  author: PublicAuthor
}
const authors: PublicAuthor[] = [
  {
    _id: "demo-milo",
    handle: "milo",
    name: "milo maybe",
    bio: "Collecting little things. Usually distracted by a bird.",
    accent: "yellow",
    sticker: "✳",
  },
  {
    _id: "demo-june",
    handle: "junebug",
    name: "june bug",
    bio: "Professional overthinker. Amateur everything else.",
    accent: "pink",
    sticker: "✿",
  },
  {
    _id: "demo-otto",
    handle: "otto",
    name: "otto",
    bio: "Making things, occasionally on purpose.",
    accent: "blue",
    sticker: "★",
  },
]
const words = [
  [
    "An incomplete guide to doing absolutely nothing",
    "In defense of staring out the window, taking the long way home, and having precisely zero updates.",
    ["life", "small-joys"],
    "nothing",
  ],
  [
    "Things I found in my pockets this week",
    "A receipt, a very good rock, and the vague feeling that I was supposed to be somewhere.",
    ["tiny-stories", "collections"],
    "pockets",
  ],
  [
    "My houseplants have formed a union",
    "Their demands are reasonable. My ability to remember watering day is not.",
    ["life", "plants"],
    "plants",
  ],
  [
    "The internet used to feel like a weird little room",
    "Maybe we can make a corner of it feel that way again. Shoes off. No elevator pitches.",
    ["internet", "thoughts"],
    "internet",
  ],
  [
    "A love letter to the 11:47 pm snack",
    "Some thoughts are better with toast. These are those thoughts.",
    ["food", "small-joys"],
    "toast",
  ],
  [
    "Bad drawings of good dogs",
    "An ongoing investigation into why every dog I draw looks like a loaf of bread.",
    ["art", "tiny-stories"],
    "dogs",
  ],
] as const
export const demoPosts: PublicPost[] = words.map(
  ([title, excerpt, tags, slug], i) => ({
    _id: `demo-${slug}`,
    title,
    excerpt,
    tags: [...tags],
    slug,
    commentsClosed: false,
    publishedAt: Date.UTC(2026, 9, 6 - i),
    author: authors[i % 3],
    body:
      JSON.stringify({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: excerpt }] },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              { type: "text", text: "A small, unnecessary observation" },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "There is something nice about making a thing simply because you felt like it. No strategy, no grand announcement. Just a few words left in a little corner of the internet.",
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "It does not have to be important to be worth sharing.",
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This is a sample post in the local preview. Once the community is connected, this space belongs to its writers. Bring your odd observations, unfinished theories, and extremely specific enthusiasm.",
              },
            ],
          },
        ],
      }) || EMPTY_BODY,
  })
)
