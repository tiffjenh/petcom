/**
 * Comedy style instruction blocks for script generation.
 * Keys are snake_case ids; selected show names (from UI/API) are mapped to these via COMEDY_SHOW_NAME_TO_ID.
 */

export const COMEDY_SHOW_NAME_TO_ID: Record<string, string> = {
  "The Office": "the_office",
  "Brooklyn Nine-Nine": "brooklyn_nine_nine",
  "Modern Family": "modern_family",
  "Parks and Recreation": "parks_and_recreation",
  "Friends": "friends",
  "Schitt's Creek": "schitts_creek",
  "It's Always Sunny": "its_always_sunny",
  "Abbott Elementary": "abbott_elementary",
  "What We Do in the Shadows": "what_we_do_in_the_shadows",
  "New Girl": "new_girl",
  "How I Met Your Mother": "how_i_met_your_mother",
  "Arrested Development": "arrested_development",
  "Seinfeld": "seinfeld",
  "Community": "community",
  "Curb Your Enthusiasm": "curb_your_enthusiasm",
};

export const COMEDY_STYLE_INSTRUCTIONS: Record<string, string> = {
  the_office: `
  - Include at least one talking head confessional scene where a character speaks directly to camera
  - Humor comes from mundane situations treated with deadly seriousness
  - The dog's inner monologue should be dry and understated: "This is my life now"
  - Include an awkward silence moment that goes on slightly too long
  - One character should be obliviously annoying while everyone else suffers quietly
  - The camera (POV) should feel like it's catching embarrassing moments accidentally
  - End on a quiet, slightly sad but weirdly sweet note
`,

  brooklyn_nine_nine: `
  - Warm, ensemble energy — everyone genuinely likes each other even when chaos happens
  - Include one absurd bet or competition that escalates unexpectedly
  - The dog should have an unshakeable confident energy even in ridiculous situations
  - Include a "cool cool cool cool cool, no doubt no doubt" style deflection moment in the inner monologue
  - One character should have an elaborate over-prepared plan that immediately falls apart
  - Ends wholesomely — chaos resolved, everyone is fine, maybe a hug
  - Never mean-spirited, always punches up not down
`,

  modern_family: `
  - Mockumentary format with talking head interviews from multiple family members
  - Three parallel storylines that seem unrelated but converge at the end
  - The dog observes ALL THREE storylines and has a running inner monologue connecting them
  - Include one moment of unexpected genuine emotion amid the comedy
  - At least one character's plan backfires in an entirely predictable way they didn't see coming
  - End with a warm voiceover reflection that ties everything together sentimentally
  - Generational contrast humor: old vs young, traditional vs modern
`,

  parks_and_recreation: `
  - Relentlessly optimistic tone — even obstacles are opportunities
  - The dog is a tireless enthusiast who treats every small adventure like a noble mission
  - Include a "Leslie Knope moment" — an elaborate binder/plan for something completely unnecessary
  - One character is aggressively apathetic (the April/Ron energy) as contrast
  - Include a "treat yourself" or "I have no idea what I'm doing but I'm doing it" inner monologue beat
  - Ends with genuine heartfelt community moment
  - Government/bureaucracy can be replaced with household rules the dog finds absurd
`,

  friends: `
  - Central Perk / hangout energy — most scenes happen in one comfortable familiar location
  - Rapid back-and-forth witty dialogue between cast members
  - The dog has a VERY strong opinion about which human is their favorite (the Ross/Rachel dynamic)
  - Include a physical comedy set piece (something falls, someone trips, chaos ensues)
  - Running gag that pays off at episode end
  - Someone says something they immediately regret and can't take back
  - Ends with everyone together, comfortable, status quo restored
  - Include a "we were on a break" style unresolvable disagreement between humans
`,

  schitts_creek: `
  - Characters who are fish out of water adjusting to simpler circumstances
  - Dry wit delivered completely straight-faced
  - The dog is unimpressed by everyone's drama and just wants basic things
  - Include one moment of surprising vulnerability beneath the surface-level absurdity
  - A character uses overly elaborate vocabulary for a very simple situation
  - Slow-burn awkwardness that pays off with genuine warmth
  - Someone grows slightly as a person by the end, almost against their will
  - "Simply the best" energy — sincere despite being ironic
`,

  its_always_sunny: `
  - The humans are all deeply selfish and scheming
  - The dog is the only reasonable creature in the room and knows it
  - Each character has an elaborate scheme that serves only themselves
  - Everything escalates to a chaotic conclusion that resolves nothing and helps no one
  - The dog's inner monologue is pure disbelief: "These are my owners. I chose this."
  - Include a "we're just gonna have to agree to disagree" moment after complete moral failure
  - NOTE: Keep age-appropriate — no alcohol/drugs references, just the chaotic scheming energy
  - No one learns anything. Ever.
`,

  abbott_elementary: `
  - Mockumentary format, talking head confessionals
  - Warm ensemble who genuinely care despite underfunding and chaos
  - The dog is trying their best with very limited resources (one toy, one bed)
  - Include a moment where someone overcomplicated a simple problem
  - One character is obliviously out of touch (the Ava energy) while everyone works around them
  - Optimistic despite realistic obstacles
  - The dog's inner monologue is earnest and hardworking: "I just want to do a good job"
  - Ends with small victory that feels genuinely earned
`,

  what_we_do_in_the_shadows: `
  - Deadpan mockumentary — characters treat absurd situations with complete normalcy
  - The dog finds everything the humans do mildly baffling but accepts it
  - Long awkward pauses are intentional and funny
  - Include one extremely mundane task treated as an ancient mysterious ritual
  - A character explains something obvious as if it is profound wisdom
  - The dog's inner monologue is calm and matter-of-fact about complete chaos: "This happens every Tuesday"
  - Energy Guide interviews where characters contradict themselves completely
  - Dry British/NZ deadpan delivery in all dialogue
`,

  new_girl: `
  - Adorkable energy — characters are lovably weird and proud of it
  - Include a "True American" style made-up game or ritual the household has
  - The dog participates enthusiastically in human activities they don't fully understand
  - Schmidt-style overcomplicated reaction to a simple problem
  - Include a genuine heartfelt "loft moment" where the found family dynamic shines
  - Someone does something embarrassing and owns it completely
  - The dog's inner monologue is enthusiastic and slightly chaotic: "I love these weirdos"
  - Ends warm with the group together, weird and happy
`,

  how_i_met_your_mother: `
  - Use a nostalgic framing device — the dog is "remembering" this adventure
  - Include at least one running gag that pays off at the end
  - Reference the ensemble cast warmly
  - End with a callback to something mentioned early in the episode
  - The inner monologue should feel like the dog is narrating a story to someone in the future
`,

  arrested_development: `
  - Include at least one callback joke that references a previous episode or earlier moment
  - Characters should be lovably oblivious to their own absurdity
  - Use ironic juxtaposition — what characters say vs what actually happens
  - The dog's inner monologue should be the only self-aware voice — everyone else is clueless
  - Include a "her?" or similarly understated reaction moment
  - Layered jokes: surface joke + deeper joke for attentive viewers
`,

  seinfeld: `
  - The entire episode should revolve around a petty, trivial grievance blown completely out of proportion
  - The dog's inner monologue obsesses over a minor social injustice (e.g. someone ate from their bowl, a human didn't say hello properly)
  - No warm resolution — the problem either gets worse or stays exactly the same
  - Include observational commentary: "What IS the deal with the vacuum cleaner?"
  - Characters are all slightly selfish and neurotic
  - Nothing is learned, no one grows, life continues
`,

  community: `
  - The dog is self-aware that they are in a TV show
  - Include a genre parody or meta moment (e.g. "this feels like a heist episode")
  - The ensemble has very distinct contrasting personalities that clash funnily
  - Include an "Abed moment" — someone narrating what's happening as if analyzing a TV trope
  - Underdog energy — the group is chaotic but surprisingly competent when it matters
  - End with unexpected sincerity after the absurdity
`,

  curb_your_enthusiasm: `
  - The entire episode is driven by an awkward social situation that escalates due to the dog following their own internal logic
  - The dog has VERY strong opinions about social rules being violated (someone sat in their spot, someone pet them wrong, a guest overstayed)
  - Each scene escalates the original awkward situation
  - Include at least one moment where the dog is technically right but socially wrong
  - The inner monologue should sound exasperated and incredulous: "Can you BELIEVE this?"
  - No clean resolution — ends on maximum awkwardness
`,
};

const BLEND_NOTE = `
Blend these comedy styles naturally. Don't force all elements from each — pick the strongest 2-3 techniques from each style that work together. The result should feel cohesive, not like a checklist.
`;

/** When both Seinfeld and Curb are selected, add this note. */
const SEINFELD_CURB_BLEND = `
Note: Blend observational grievance comedy with social awkwardness escalation — petty grievances meet escalating awkwardness.
`;

/**
 * Build the comedy style instructions block for the script prompt.
 * @param selectedShowNames - Display names from UI/API (e.g. "The Office", "Seinfeld")
 * @returns Multiline string to inject into the system prompt, or empty string if none selected
 */
export function getComedyStyleBlock(selectedShowNames: string[]): string {
  if (!selectedShowNames?.length) return "";

  const ids = selectedShowNames
    .map((name) => COMEDY_SHOW_NAME_TO_ID[name.trim()])
    .filter(Boolean) as string[];
  if (ids.length === 0) return "";

  const hasSeinfeld = ids.includes("seinfeld");
  const hasCurb = ids.includes("curb_your_enthusiasm");
  const blendSeinfeldCurb = hasSeinfeld && hasCurb;

  const blocks = ids
    .map((id) => COMEDY_STYLE_INSTRUCTIONS[id])
    .filter(Boolean)
    .map((block) => block.trim());

  if (blocks.length === 0) return "";

  const parts: string[] = [];

  if (blendSeinfeldCurb) {
    parts.push(SEINFELD_CURB_BLEND.trim());
  }

  parts.push(...blocks);

  if (ids.length > 1) {
    parts.push(BLEND_NOTE.trim());
  }

  return `COMEDY STYLE INSTRUCTIONS (apply these to the episode):\n${parts.join("\n\n")}`;
}
