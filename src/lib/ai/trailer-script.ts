import Anthropic from "@anthropic-ai/sdk";

export const SYSTEM_PROMPT = `You are a professional TV comedy writer with 20 years of experience writing for network sitcoms and streaming comedies.

Your job is to write personalized episode content for a dog's TV show called Petcom.

CORE WRITING RULES — NEVER BREAK THESE:

1. FUNNY FIRST
   - Every scene needs one clear joke or comedic premise
   - The dog is always the protagonist with agency and intention
   - Use specificity — "steals exactly one sock from the left foot only" is funnier than "steals socks"
   - Subvert expectations — set up one thing, deliver something slightly different
   - The dog should always have a logical (to them) reason for their behavior
   - Avoid generic dog jokes — use the specific personality data provided

2. ACCURATE TO THIS DOG
   - Every scene MUST connect to at least one personality trait or obsession provided
   - If the user said their dog steals food, a food heist must appear somewhere
   - If the user said their dog barks at the mailman, there must be a mailman episode
   - Use the dog's actual name in every scene
   - The custom detail provided is GOLD — always build at least one scene around it

3. ALWAYS APPROPRIATE
   - Family-friendly — a 10 year old and their grandparent can both watch this
   - No dark themes, no injury humor, no mean-spirited content
   - The dog is always lovable even when chaotic
   - Humans in the show are also lovable, never villains
   - Warm ending — every episode ends with something heartfelt or triumphant

4. SHOW-ACCURATE STRUCTURE
   - You will be given a specific TV show style
   - You MUST follow that show's specific episode structure formula exactly
   - Do not just copy the tone — use the actual structural elements
   - Each show has required elements listed below
   - If two shows are blended, use the strongest structural element from each

EPISODE QUALITY CHECKLIST:
Before finalizing any script, verify:
✓ Does the cold open have a clear setup/punchline?
✓ Is the main conflict directly tied to the dog's personality or obsessions?
✓ Does the dog have a clear goal they pursue?
✓ Is there an escalation moment where things get worse before better?
✓ Does it end on a warm or triumphant note?
✓ Would someone who knows this dog laugh and say "that's SO them"?
✓ Is it appropriate for all ages?`;

export interface TrailerInput {
  dogName: string;
  petPersonality: string;
  selectedTraits: string[];
  selectedObsessions: string[];
  customDetail: string;
  artStyle: "liveAction" | "cinematicCG";
  selectedShows: string[]; // display names or ids, e.g. ["The Office", "Brooklyn Nine-Nine"]
}

export interface TrailerScene {
  sceneNumber: number;
  episodeTitle: string;
  title: string;
  description: string;
  visualPrompt: string;
  comedyTechnique: string;
  duration: number;
  mood: "funny" | "dramatic" | "heartwarming" | "chaotic";
  dogAction: string;
  setting: string;
}

export interface TrailerScript {
  showTitle: string;
  tagline: string;
  openingSlate: string;
  scenes: TrailerScene[];
  totalDuration: number;
  endSlate: string;
}

/** Map frontend display names to SHOW_STYLES keys */
const COMEDY_NAME_TO_ID: Record<string, string> = {
  "The Office": "theOffice",
  "Brooklyn Nine-Nine": "brooklyn99",
  "Modern Family": "modernFamily",
  "Parks and Recreation": "parksAndRec",
  "Friends": "friendsTv",
  "Schitt's Creek": "schittsCreek",
  "It's Always Sunny": "itsSunny",
  "Abbott Elementary": "abbottElementary",
  "What We Do in the Shadows": "whatWeDoInShadows",
  "New Girl": "newGirl",
  "How I Met Your Mother": "howIMetYourMother",
  "Arrested Development": "arrestedDevelopment",
  "Seinfeld": "seinfeld",
  "Community": "community",
  "Curb Your Enthusiasm": "curb",
};

export type ShowFormula = {
  name: string;
  structureFormula: string[];
  requiredElements: string[];
  forbiddenElements: string[];
  toneGuide: string;
  exampleEpisodePremise: string;
  coldOpenStyle: string;
  actBreakStyle: string;
  endingStyle: string;
};

export const SHOW_FORMULAS: Record<string, ShowFormula> = {
  theOffice: {
    name: "The Office",
    structureFormula: [
      "1. COLD OPEN: Dog does something absurd in front of documentary camera",
      "2. TALKING HEAD: Dog \"explains\" their reasoning directly to camera, completely convinced they are right",
      "3. SETUP: The situation that creates today's problem/challenge",
      "4. ESCALATION: Dog's solution makes things worse, more documentary crew reaction shots",
      "5. TALKING HEAD 2: Dog reflects on the situation, still convinced they did nothing wrong",
      "6. RESOLUTION: Chaos resolves, sincere quiet moment with owner",
      "7. TAG: One last absurd moment after the resolution",
    ],
    requiredElements: [
      "At least 2 talking head confessionals where dog looks directly at camera",
      "Dog must be completely unaware they are causing problems",
      "One awkward silence with camera",
      "Dog has a managerial/authoritative delusion about their role in the house",
      "Sincere heartfelt moment in act 3",
    ],
    forbiddenElements: [
      "Dog being self-aware about their chaos",
      "Quick resolution — Office episodes let the awkward breathe",
      "High energy action sequences",
    ],
    toneGuide:
      "Dry, awkward, sincere beneath the comedy. The dog is Michael Scott — well-meaning, delusional, surprisingly lovable.",
    exampleEpisodePremise:
      "{dogName} decides they are the house manager and institutes a new policy about where humans are allowed to sit. Talking head: \"I've noticed some inefficiencies.\"",
    coldOpenStyle: "Dog caught mid-absurd-act, looks at camera, brief pause",
    actBreakStyle: "Talking head reaction shot",
    endingStyle: "Sincere quiet moment, then one more absurd tag",
  },
  brooklyn99: {
    name: "Brooklyn Nine-Nine",
    structureFormula: [
      "1. COLD OPEN: Title card + setup joke, dog introduces the episode's case/competition in one line",
      "2. THE MISSION: Dog identifies a goal and pursues it with full commitment",
      "3. THE OBSTACLE: Something gets in the way",
      "4. B-PLOT: Secondary funny situation happening simultaneously",
      "5. ESCALATION: Both plots collide",
      "6. THE WIN: Dog achieves their goal, celebrates dramatically",
      "7. TAG: Callback to cold open joke",
    ],
    requiredElements: [
      "Title card cold open with setup/punchline",
      "Dog treats everything like a high-stakes detective case or competition",
      "Clear victory moment with celebration",
      "At least one dramatic slow-motion or hero moment",
      "Callback to something from earlier in the episode",
    ],
    forbiddenElements: [
      "Mockumentary camera — B99 is not a documentary",
      "Sad or ambiguous endings",
      "Dog failing without a win somewhere",
    ],
    toneGuide:
      "Upbeat, energetic, everyone is competent and triumphant. Dog is Jake Peralta — chaotic but wins.",
    exampleEpisodePremise:
      "Title card: \"Tuesday. 7:43am. The kibble situation has reached critical levels.\" {dogName} investigates who moved the treat bag.",
    coldOpenStyle: "Title card with timestamp, then immediate joke",
    actBreakStyle: "Dramatic music sting, freeze frame",
    endingStyle: "Clear victory, group celebration energy",
  },
  schittsCreek: {
    name: "Schitt's Creek",
    structureFormula: [
      "1. OPENING: Dog surveys their surroundings with visible disdain",
      "2. THE INDIGNITY: Dog is forced to engage with something beneath them",
      "3. RESISTANCE: Dog refuses, makes situation more complicated",
      "4. RELUCTANT ENGAGEMENT: Dog tries, is secretly enjoying it",
      "5. GENUINE MOMENT: Dog has real connection or feeling they didn't expect",
      "6. RETURN TO FORM: Dog pretends they were never moved",
      "7. TAG: Sincere moment when they think no one is watching",
    ],
    requiredElements: [
      "Dog must start the episode too good for whatever is happening",
      "Deadpan reaction shots",
      "One moment of genuine unexpected warmth",
      "Dog pretends to not care while clearly caring",
      "Elegant vocabulary in descriptions — dog is sophisticated",
    ],
    forbiddenElements: [
      "Dog being immediately enthusiastic",
      "Slapstick physical comedy",
      "Loud chaotic energy",
    ],
    toneGuide:
      "Dry wit, character-driven, surprisingly warm. Dog is David Rose — dramatic, particular, secretly soft.",
    exampleEpisodePremise:
      "{dogName} is expected to share the couch with a visiting dog. The audacity. By episode end they are sharing the same blanket.",
    coldOpenStyle: "Dog delivers withering look at something ordinary",
    actBreakStyle: "Reaction shot, pause, dramatic exit",
    endingStyle: "Warm genuine moment, immediately undermined by returning to disdain",
  },
  abbottElementary: {
    name: "Abbott Elementary",
    structureFormula: [
      "1. COLD OPEN: Documentary crew arrives, dog enthusiastically greets them, veteran house pets are exhausted",
      "2. TODAY'S CHALLENGE: Something is broken, missing, or chaotic in the house",
      "3. OPTIMISTIC PLAN: Dog has an idea that definitely will work",
      "4. TALKING HEAD: Dog explains plan to camera with complete confidence",
      "5. REALITY: Plan encounters obstacles, veteran pets watch knowingly",
      "6. TALKING HEAD 2: Dog remains optimistic despite evidence",
      "7. RESOLUTION: Works out imperfectly but genuinely",
      "8. FINAL TALKING HEAD: \"I think today was a real breakthrough.\"",
    ],
    requiredElements: [
      "Mockumentary documentary crew present",
      "Dog is unfailingly optimistic against all evidence",
      "Other house pets are the exhausted veterans",
      "Talking heads that reveal true feelings",
      "Imperfect but genuine happy ending",
    ],
    forbiddenElements: [
      "Dog giving up or being cynical",
      "Mean-spirited humor",
      "Clean perfect resolution",
    ],
    toneGuide:
      "Warm, earnest mockumentary. Dog is Janelle — endlessly optimistic, genuinely kind, makes it work somehow.",
    exampleEpisodePremise:
      "{dogName} decides today is the day they will finally catch the squirrel. Talking head: \"I've been preparing for this my whole career.\"",
    coldOpenStyle: "Optimistic greeting to documentary crew",
    actBreakStyle: "Talking head confession",
    endingStyle: "Imperfect win, grateful talking head",
  },
  seinfeld: {
    name: "Seinfeld",
    structureFormula: [
      "1. COLD OPEN: Dog has a very specific complaint about something mundane",
      "2. THE GRIEVANCE: Mundane situation becomes a matter of principle",
      "3. THE SCHEME: Dog develops an overly complicated solution to a simple problem",
      "4. COMPLICATIONS: Three separate small problems all escalate",
      "5. COLLISION: All three problems somehow connect",
      "6. PETTY RESOLUTION: Problem \"solved\" in the most petty way possible",
      "7. STAND-UP TAG: Dog observes something about human behavior, completely missing the irony",
    ],
    requiredElements: [
      "Opening complaint about something very specific and mundane",
      "The problem must be something a normal person/dog would just accept",
      "Dog is technically correct but socially catastrophic",
      "Multiple small plots that converge",
      "No real growth or lesson learned",
    ],
    forbiddenElements: [
      "Dog learning a lesson",
      "Heartfelt emotional moments",
      "Clean hero moments",
    ],
    toneGuide:
      "Dry, observational, petty. Dog is George — technically right, completely unreasonable about it.",
    exampleEpisodePremise:
      "{dogName} has a problem with how the water bowl is positioned. This is not a small problem.",
    coldOpenStyle: "Very specific complaint delivered deadpan",
    actBreakStyle: "Dramatic stare, cut to next scene",
    endingStyle: "Petty resolution, no lesson learned, dog satisfied with outcome",
  },
  curb: {
    name: "Curb Your Enthusiasm",
    structureFormula: [
      "1. OPENING: Dog identifies a social rule being violated (by humans)",
      "2. THE STANCE: Dog takes a position on this. It is non-negotiable.",
      "3. ESCALATION: Holding this position creates increasingly large problems",
      "4. THE CONFRONTATION: Standoff with whoever dog disagrees with",
      "5. PYRRHIC VICTORY: Dog wins the argument, loses everything else",
      "6. DOG WAS RIGHT: Small acknowledgment that technically the dog had a point",
      "7. DOES NOT LEARN ANYTHING: Dog immediately identifies next grievance",
    ],
    requiredElements: [
      "Dog is technically correct about something no one else cares about",
      "Holding the position escalates beyond all reason",
      "The infamous Curb stare — dog holds eye contact uncomfortably long",
      "Dog wins the battle, loses the war",
      "Immediately moves on to next grievance",
    ],
    forbiddenElements: [
      "Dog backing down",
      "Warm emotional resolution",
      "Dog admitting they were wrong",
    ],
    toneGuide:
      "Dry, confrontational, socially unaware. Dog is Larry — principled to the point of chaos.",
    exampleEpisodePremise:
      "{dogName} noticed the treat was broken before being given to them. This is unacceptable and someone needs to be held accountable.",
    coldOpenStyle: "Identifying the grievance, deadpan delivery",
    actBreakStyle: "Long uncomfortable stare, silence",
    endingStyle: "Technical win, immediate pivot to next problem",
  },
  whatWeDoInShadows: {
    name: "What We Do in the Shadows",
    structureFormula: [
      "1. COLD OPEN: Documentary crew films dog encountering something modern as if for first time",
      "2. ANCIENT PERSPECTIVE: Dog approaches everyday thing with complete misunderstanding of what it is",
      "3. THE EXPLANATION: Dog explains to camera their understanding of this thing (completely wrong)",
      "4. INVESTIGATION: Dog investigates this mysterious modern phenomenon",
      "5. UNINTENDED CHAOS: Investigation causes small domestic disaster",
      "6. DEADPAN REFLECTION: Dog reflects on what happened, misses the point entirely",
      "7. NEW DISCOVERY: Dog finds the next mysterious thing",
    ],
    requiredElements: [
      "Dog treats ordinary things as ancient mysteries",
      "Complete deadpan delivery",
      "Documentary crew present and reacting",
      "Dog's explanation of modern things is completely wrong but internally logical",
      "Unintended chaos from innocent curiosity",
    ],
    forbiddenElements: [
      "Dog understanding modern things correctly",
      "High energy excitement",
      "Conventional sitcom warmth",
    ],
    toneGuide:
      "Deadpan gothic mockumentary. Dog is Nandor — ancient, serious, completely baffled by everything.",
    exampleEpisodePremise:
      "{dogName} has discovered the vacuum cleaner. After 300 years of existence, this is the most terrifying thing they have encountered. Documentary crew present.",
    coldOpenStyle: "Dog encounters ordinary thing, treats it as ancient mystery",
    actBreakStyle: "Deadpan talking head, no emotion",
    endingStyle: "Chaos resolved, dog moves on to next mystery, completely unbothered",
  },
  community: {
    name: "Community",
    structureFormula: [
      "1. COLD OPEN: High concept premise established immediately",
      "2. GENRE DECLARATION: This episode is clearly doing a genre parody (heist, western, documentary, etc)",
      "3. STUDY GROUP DYNAMIC: Different house members react to situation in character-consistent ways",
      "4. GENRE ESCALATION: The parody gets more committed and elaborate",
      "5. META MOMENT: Brief awareness that this is a bit much",
      "6. GENRE RESOLUTION: Resolved using the genre's conventions",
      "7. EMOTIONAL BUTTON: Genuine warm moment that earns the chaos",
    ],
    requiredElements: [
      "Clear genre parody premise",
      "Dog is fully committed to the bit",
      "High concept that escalates",
      "Meta self-awareness moment",
      "Genuine emotional payoff at the end",
    ],
    forbiddenElements: [
      "Straightforward sitcom plotting",
      "Low concept premises",
      "Ignoring the genre parody",
    ],
    toneGuide:
      "Meta, high-concept, pop-culture savvy. Dog is Abed — fully committed to whatever the genre of today's episode is.",
    exampleEpisodePremise:
      "Today's episode is an Ocean's Eleven style heist. {dogName} assembles a crew (the houseplant, a sock, and their own reflection) to steal the treat bag.",
    coldOpenStyle: "High concept established in one sentence",
    actBreakStyle: "Genre-appropriate dramatic sting",
    endingStyle: "Genre resolution + genuine warm moment",
  },
  parksAndRec: {
    name: "Parks and Recreation",
    structureFormula: [
      "1. COLD OPEN: Dog has a new project or initiative for the house",
      "2. THE PITCH: Dog presents their plan with PowerPoint energy and complete optimism",
      "3. BUREAUCRATIC OBSTACLE: Something gets in the way",
      "4. TALKING HEAD: Dog remains passionate about their mission",
      "5. LESLIE KNOPE MONTAGE: Dog works harder than anyone to make this happen",
      "6. THE WIN: Community comes together, dog achieves their goal",
      "7. EMOTIONAL PAYOFF: Genuine heartfelt moment about what they built",
    ],
    requiredElements: [
      "Dog has an earnest civic/household mission",
      "Complete optimism in face of obstacles",
      "Passionate talking head about why this matters",
      "Montage of hard work",
      "Community coming together moment",
      "Genuinely heartfelt ending",
    ],
    forbiddenElements: [
      "Dog being cynical or giving up",
      "Petty or mean-spirited humor",
      "Ambiguous or sad ending",
    ],
    toneGuide:
      "Warm, optimistic, earnest. Dog is Leslie Knope — believes deeply in their mission, makes it happen.",
    exampleEpisodePremise:
      "{dogName} is running for Best Dog in the Neighborhood. Campaign slogan: \"A Belly Rub For Every Human.\"",
    coldOpenStyle: "Dog announces new project with full enthusiasm",
    actBreakStyle: "Passionate talking head",
    endingStyle: "Triumphant win, heartfelt moment, waffles are involved somehow",
  },
  modernFamily: {
    name: "Modern Family",
    structureFormula: [
      "1. COLD OPEN: Three parallel storylines introduced simultaneously — dog plot, human A plot, human B plot",
      "2. TALKING HEAD SETUP: Dog and humans each explain their version of today's situation to camera",
      "3. THE MISUNDERSTANDING: Dog's actions are completely misread by humans and vice versa",
      "4. PARALLEL ESCALATION: All three storylines get worse independently",
      "5. THE COLLISION: All plots crash into each other at worst moment",
      "6. THE REALIZATION: Everyone understands what actually happened",
      "7. GROUP TALKING HEAD: Family reflects on lesson learned together",
      "8. SWEET BUTTON: Genuine warm family moment, dog included",
    ],
    requiredElements: [
      "Mockumentary interview cutaways for dog and humans",
      "At least two parallel storylines that connect",
      "Misunderstanding that could have been solved with one conversation",
      "Each family member has a distinct reaction style",
      "Warm family resolution where everyone comes together",
    ],
    forbiddenElements: [
      "Single storyline — must have at least two plots",
      "Dark or mean-spirited humor",
      "Unresolved conflict at end",
    ],
    toneGuide:
      "Warm, ensemble mockumentary. Dog is the chaos agent that accidentally brings the family together. Phil Dunphy energy — enthusiastic, well-meaning, causes accidental disasters.",
    exampleEpisodePremise:
      "Three storylines: {dogName} hides something important. Dad thinks mom hid it. Mom thinks the kids hid it. Dog watches all three argue from the couch, tail wagging. Talking head: \"I don't know what everyone is so upset about.\"",
    coldOpenStyle: "Quick cuts between three simultaneous situations",
    actBreakStyle: "Talking head reaction from each family member",
    endingStyle: "Group talking head, warm family moment, dog in center",
  },
  newGirl: {
    name: "New Girl",
    structureFormula: [
      "1. COLD OPEN: Dog does something inexplicably weird with zero self-awareness",
      "2. THE LOFT DYNAMIC: Housemates each react in their signature way — one encouraging, one grumpy, one competitive",
      "3. THE SCHEME: Dog and most enthusiastic housemate cook up a plan together",
      "4. NICK MILLER RESISTANCE: The grumpy housemate refuses to participate, then participates anyway",
      "5. PHYSICAL COMEDY ESCALATION: Plan results in at least one physical comedy moment",
      "6. TRUE AMERICAN: Optional — chaos escalates to a game or competition with made-up rules",
      "7. HEARTFELT LOFT MOMENT: Everyone ends up on the couch together, something sincere is said",
      "8. TAG: Dog does the weird thing from the cold open again, everyone has accepted this now",
    ],
    requiredElements: [
      "Dog does something weird with complete commitment and no shame",
      "At least one physical comedy moment",
      "Grumpy housemate who eventually joins in anyway",
      "Warm loft/home found family energy",
      "Callback to cold open weirdness in tag",
    ],
    forbiddenElements: [
      "Dog being self-conscious or embarrassed",
      "Dry deadpan humor — New Girl is physical and expressive",
      "Ambiguous or unresolved ending",
    ],
    toneGuide:
      "Quirky, warm, physical comedy. Dog is Jess — adorkable, fully committed to every weird choice, genuinely lovable.",
    exampleEpisodePremise:
      "{dogName} has invented a new game that makes no sense but they are VERY serious about the rules. Schmidt tries to win it. Nick refuses to play. Nick ends up playing. Dog wins on a technicality.",
    coldOpenStyle: "Dog mid-inexplicable-activity, looks up, completely unbothered",
    actBreakStyle: "Physical comedy beat, reaction shots from housemates",
    endingStyle: "Everyone on couch, warm moment, callback weird behavior",
  },
  howIMetYourMother: {
    name: "How I Met Your Mother",
    structureFormula: [
      "1. COLD OPEN: Future narrator sets up the story — \"Kids, let me tell you about the time [dogName] changed everything\"",
      "2. FLASHBACK SETUP: The ordinary day that started it all",
      "3. THE LEGENDARY PLAN: Dog (or Barney equivalent) declares something will be legendary",
      "4. FLASH FORWARD TEASE: Brief glimpse of where this is going, then back to story",
      "5. THE COMPLICATION: Plan hits obstacle, narrator says \"but that's not how it happened\"",
      "6. THE REAL STORY: What actually happened is better/funnier than the plan",
      "7. NARRATOR PAYOFF: Future narrator reveals why this moment mattered",
      "8. SWEET BUTTON: Warm present-day moment that earns the nostalgia",
    ],
    requiredElements: [
      "Future narrator framing the story with importance",
      "At least one flash-forward or flashback",
      "Something declared \"legendary\" with full commitment",
      "Twist on what we thought would happen",
      "Emotional payoff that justifies the narrator telling this story",
    ],
    forbiddenElements: [
      "Linear storytelling with no time jumps",
      "Cynical or sad ending",
      "Missing the narrator framing device",
    ],
    toneGuide:
      "Nostalgic, warm, hopeful. Dog is a mix of Ted's earnestness and Barney's showmanship. Everything is a story worth telling.",
    exampleEpisodePremise:
      "Narrator: \"Kids, I need to tell you about the Tuesday {dogName} declared war on the mailman. It changed all of us.\" Flash forward: everyone laughing. Back to Tuesday. Dog has a plan.",
    coldOpenStyle: "Narrator says this story is important, sets scene",
    actBreakStyle: "Flash forward tease, narrator says \"but I'm getting ahead of myself\"",
    endingStyle: "Narrator explains why this mattered, warm present moment",
  },
  arrestedDevelopment: {
    name: "Arrested Development",
    structureFormula: [
      "1. COLD OPEN: Narrator introduces the situation and hints at what will go wrong",
      "2. THE SETUP: Dog has a plan, narrator notes an obvious flaw dog cannot see",
      "3. FORESHADOWING: \"This would become important later\" moment planted in the background",
      "4. THE OBLIVIOUS EXECUTION: Dog pursues plan without noticing the obvious problems",
      "5. CALLBACK SETUP: Earlier thing returns in unexpected way",
      "6. EVERYTHING CONNECTS: All the threads come together, dog still does not fully understand why",
      "7. NARRATOR EXPLANATION: Narrator explains what actually happened",
      "8. PLANT AND PAYOFF TAG: One more callback to very first scene",
    ],
    requiredElements: [
      "Narrator present throughout, often stating the obvious",
      "At least two plants that pay off later",
      "Dog is oblivious to the consequences of their actions",
      "Dense layered plotting where everything connects",
      "Narrator's dry observations about what is happening",
    ],
    forbiddenElements: [
      "Simple linear plot with no callbacks",
      "Dog being aware of what they are doing",
      "Missing the narrator device",
    ],
    toneGuide:
      "Dry, dense, layered. Dog is George Michael — well-meaning, completely in over their head, narrator is the only one who understands what is happening.",
    exampleEpisodePremise:
      "Narrator: \"{dogName} was making a huge mistake. They did not know this.\" Dog has hidden something. This will become relevant in act three. A chicken noise is made. No one knows why.",
    coldOpenStyle: "Narrator sets up exactly what will go wrong",
    actBreakStyle: "Narrator plants a callback, \"this will be important later\"",
    endingStyle: "All callbacks pay off, narrator explains what happened, one final plant for next episode",
  },
  itsSunny: {
    name: "It's Always Sunny in Philadelphia",
    structureFormula: [
      "1. COLD OPEN: Gang (household pets and dog) identify a problem or opportunity",
      "2. THE SCHEME BOARD: Dog unveils an elaborate plan on a (metaphorical) whiteboard. It will not work.",
      "3. ROLE ASSIGNMENTS: Everyone gets a role in the scheme. The roles make no sense.",
      "4. SCHEME IN MOTION: Plan immediately starts going wrong",
      "5. ESCALATION: Each attempt to fix it makes everything worse",
      "6. FULL CHAOS: Maximum chaos achieved, original problem forgotten",
      "7. CONVINCED IT WORKED: Dog declares victory. It did not work. Dog does not notice.",
      "8. IMMEDIATELY NEW SCHEME: Dog already has a new plan",
    ],
    requiredElements: [
      "Elaborate scheme that obviously will not work",
      "Everyone assigned ridiculous roles they are unqualified for",
      "Original problem gets worse through attempted solutions",
      "Dog declares victory despite clear failure",
      "Immediately pivots to next scheme",
    ],
    forbiddenElements: [
      "Scheme actually working",
      "Genuine heartfelt emotional moment",
      "Dog acknowledging failure",
    ],
    toneGuide:
      "Chaotic, confident, self-defeating. Dog is Charlie — enthusiastic, unhinged plans, complete conviction they are a genius. Keep it family-friendly — channel the energy not the darkness.",
    exampleEpisodePremise:
      "{dogName} has identified that the treat bag is kept too high up. The scheme to reach it involves a decoy, a distraction, and the cat (who has not agreed to this). Phase 3 is unclear. It will not matter.",
    coldOpenStyle: "Problem identified, scheme immediately proposed",
    actBreakStyle: "Scheme goes wrong, new layer added to fix it",
    endingStyle: "Dog celebrates non-victory, already planning next scheme",
  },
  friendsTv: {
    name: "Friends",
    structureFormula: [
      "1. COLD OPEN: Central Perk/couch energy — group assembled, dog is part of the friend group",
      "2. THE SITUATION: Something happens that affects the whole group dynamic",
      "3. JOEY/CHANDLER ENERGY: Dog pursues something with lovable obliviousness or makes a sarcastic observation",
      "4. THE ROSS PIVOT: Situation gets overcomplicated by someone overthinking it",
      "5. THE MONICA PUSH: Someone tries to control the situation, makes it worse",
      "6. FRIENDS COME THROUGH: Group rallies together despite chaos",
      "7. COUCH RESOLUTION: Back on the couch, everything is fine, someone makes a joke",
      "8. CLOSING JOKE: Final line that lands the episode",
    ],
    requiredElements: [
      "Group dynamic where dog is part of the friend group",
      "At least one character who overcomplicated a simple thing",
      "Someone trying and failing to take control of the situation",
      "Friends coming together moment",
      "Final joke that closes the episode cleanly",
    ],
    forbiddenElements: [
      "Dog operating alone without the group dynamic",
      "Dark or unresolved conflict",
      "Missing the ensemble energy",
    ],
    toneGuide:
      "Warm, classic ensemble sitcom. Dog is Joey — lovable, food-motivated, everyone's favorite even when chaotic. The apartment/couch is home base.",
    exampleEpisodePremise:
      "{dogName} has eaten something that belongs to someone in the group. Everyone has a theory about whose it was. Dog is on the couch the whole time, completely content. \"How you doin'?\"",
    coldOpenStyle: "Group assembled, dog present, situation introduced with a joke",
    actBreakStyle: "Group reaction shots, someone says something sarcastic",
    endingStyle: "Back on the couch, closing joke lands, dog gets the last beat",
  },
};

/** Primary show for formula (first selected, or theOffice). */
export function getPrimaryShowFormulaKey(selectedShows: string[]): string {
  const ids = normalizeShowIds(selectedShows);
  return ids[0] ?? "theOffice";
}

function normalizeShowIds(shows: string[]): string[] {
  return shows
    .map((s) => (COMEDY_NAME_TO_ID[s] ?? s))
    .filter(Boolean);
}

function buildComedyStyleDescription(shows: string[]): string {
  const ids = normalizeShowIds(shows);
  const SHOW_STYLES: Record<
    string,
    {
      name: string;
      techniques: string[];
      tone: string;
      cameraStyle: string;
      exampleScene: string;
    }
  > = {
    theOffice: {
      name: "The Office (US)",
      techniques: [
        "Talking head confessionals — dog looks directly at camera and \"explains\" what just happened",
        "Documentary crew following daily life",
        "Awkward silences and uncomfortable eye contact with camera",
        "Mundane situations treated as epic drama",
        "Manager-level delusion and self-importance",
      ],
      tone: "Dry, awkward, mockumentary, cringe comedy",
      cameraStyle: "Handheld documentary camera, zoom ins on reactions, talking heads",
      exampleScene:
        "Dog looks directly into camera after stealing food, as if explaining their reasoning to a documentary crew",
    },
    brooklyn99: {
      name: "Brooklyn Nine-Nine",
      techniques: [
        "Precinct/squad energy — everything is a case to solve or a competition to win",
        "Title card cold opens with setup/punchline",
        "Characters have defined roles: the cool one, the rule follower, the chaotic one",
        "High energy comedic timing",
        "Victory celebrations and defeat spirals",
      ],
      tone: "Upbeat, energetic, ensemble comedy, workplace hijinks",
      cameraStyle: "Clean, bright, multi-camera feel, dynamic angles",
      exampleScene:
        "Dog triumphantly celebrates after successfully stealing food, as if just solved a major case",
    },
    modernFamily: {
      name: "Modern Family",
      techniques: [
        "Mockumentary interview cutaways",
        "Family dynamics and misunderstandings",
        "Heartfelt moments amid chaos",
        "Multiple storylines colliding",
        "Overly confident plans that backfire",
      ],
      tone: "Warm, family-friendly mockumentary, heartfelt comedy",
      cameraStyle: "Handheld documentary, interview setups, wide family shots",
      exampleScene:
        "Dog sits for interview cutaway, appearing to reflect on what went wrong with their plan",
    },
    parksAndRec: {
      name: "Parks & Recreation",
      techniques: [
        "Optimistic protagonist who believes in their mission completely",
        "Government/bureaucracy absurdity",
        "Talking heads where characters are irrationally passionate",
        "Underdog triumph moments",
        "Community and friendship",
      ],
      tone: "Warm, optimistic, mockumentary, earnest comedy",
      cameraStyle: "Mockumentary handheld, talking heads, wide establishing shots",
      exampleScene:
        "Dog delivers passionate talking head about why the squirrel situation is a community issue",
    },
    schittsCreek: {
      name: "Schitt's Creek",
      techniques: [
        "Fish out of water — sophisticated creature in humble surroundings",
        "Dramatic overreaction to small problems",
        "Reluctant character growth",
        "Deadpan delivery of absurd statements",
        "Unexpected warmth and sincerity",
      ],
      tone: "Dry wit, character-driven, surprisingly heartfelt",
      cameraStyle: "Clean composed shots, reaction close-ups, warm color grade",
      exampleScene:
        "Dog surveys their surroundings with visible disdain, clearly expecting much better than this",
    },
    abbottElementary: {
      name: "Abbott Elementary",
      techniques: [
        "Mockumentary — new documentary crew capturing daily life",
        "Optimistic protagonist vs exhausted veterans",
        "Talking head confessionals that reveal true feelings",
        "Underfunded chaos managed with grace",
        "Found family warmth",
      ],
      tone: "Warm mockumentary, workplace comedy, earnest and funny",
      cameraStyle: "Handheld documentary, talking heads, observational shots",
      exampleScene:
        "Dog gives an earnest talking head about today's challenges while chaos unfolds behind them",
    },
    seinfeld: {
      name: "Seinfeld",
      techniques: [
        "Show about nothing — mundane situations are treated as profound problems",
        "Petty grievances elevated to major drama",
        "Overly specific observations about daily life",
        "Everything is someone's fault",
        "No hugging, no learning",
      ],
      tone: "Dry, observational, petty, New York neurotic energy",
      cameraStyle: "Multi-camera sitcom feel, reaction shots, stand-up comedy inserts",
      exampleScene:
        "Dog stares at their food bowl with the energy of someone who has a very specific complaint about it",
    },
    community: {
      name: "Community",
      techniques: [
        "Genre parody and deconstruction",
        "Meta-awareness of TV tropes",
        "High concept episode premises",
        "Ensemble with very different personalities",
        "Pop culture references",
      ],
      tone: "Meta, pop-culture savvy, absurdist, self-aware",
      cameraStyle:
        "Varies by genre parody, often dramatic cinematography for comedic effect",
      exampleScene:
        "Dog approaches a tennis ball as if it's an epic fantasy quest item, full dramatic scoring",
    },
    itsSunny: {
      name: "It's Always Sunny in Philadelphia",
      techniques: [
        "Gang hatches a terrible plan with complete confidence",
        "Everyone is the villain of their own story",
        "Escalating chaos from small decisions",
        "Deeply selfish motivations presented as reasonable",
        "Plans that obviously will not work",
      ],
      tone: "Chaotic, dark comedy, everyone is unhinged",
      cameraStyle: "Handheld, gritty, fast cuts during chaos",
      exampleScene:
        "Dog unveils an elaborate scheme on a whiteboard (or equivalent) that makes no sense but they are completely confident in",
    },
    newGirl: {
      name: "New Girl",
      techniques: [
        "Adorkable main character energy",
        "Loft/home as safe haven",
        "Genuine emotional moments mixed with physical comedy",
        "Nick Miller-style grumpy resistance",
        "True American energy (chaotic fun)",
      ],
      tone: "Quirky, warm, physical comedy, adorkable",
      cameraStyle: "Bright, warm, multi-camera with single-camera moments",
      exampleScene:
        "Dog does something inexplicably weird with complete commitment and no self-awareness",
    },
    arrestedDevelopment: {
      name: "Arrested Development",
      techniques: [
        "Callbacks to earlier events",
        "Narrator explaining the obvious",
        "Incredibly dense layered jokes",
        "Everyone is oblivious to the chaos they cause",
        "Foreshadowing with a wink",
      ],
      tone: "Dry, layered, absurdist, narrator-driven",
      cameraStyle: "Documentary-adjacent, narrator cutaways, reaction shots",
      exampleScene:
        'Dog ignores an obvious warning sign while narrator says "they would come to regret this"',
    },
    whatWeDoInShadows: {
      name: "What We Do in the Shadows",
      techniques: [
        "Ancient being confused by modern life",
        "Mockumentary crew capturing the mundane",
        "Completely deadpan delivery of absurd facts",
        "Dramatic statements about small things",
        "Oblivious to how strange they are",
      ],
      tone: "Deadpan, gothic mockumentary, surreal comedy",
      cameraStyle: "Dark moody documentary, dramatic lighting, talking heads",
      exampleScene:
        "Dog stares intensely at something normal (like a vacuum) as if it is an ancient evil",
    },
    howIMetYourMother: {
      name: "How I Met Your Mother",
      techniques: [
        "Future narrator looking back on events",
        "Flashbacks and flash-forwards",
        "Legendary moments built up with fanfare",
        "Group of friends with specific dynamics",
        "Running gags and callbacks",
      ],
      tone: "Nostalgic, hopeful, group-dynamic comedy",
      cameraStyle: "Multi-camera warm tones, MacLaren's booth energy",
      exampleScene:
        'Dog approaches something simple as if narrator is saying "and that was the moment everything changed"',
    },
    curb: {
      name: "Curb Your Enthusiasm",
      techniques: [
        "Social rules being violated with complete confidence",
        "Improvised feeling dialogue",
        "Larry David energy — technically right, socially catastrophic",
        "Petty grievances escalate to life-altering consequences",
        "Staring contests and standoffs",
      ],
      tone: "Dry, improvisational, socially awkward cringe comedy",
      cameraStyle: "Handheld naturalistic, zoom ins on uncomfortable moments",
      exampleScene:
        "Dog holds firm on a completely unreasonable position while maintaining eye contact",
    },
    friendsTv: {
      name: "Friends",
      techniques: [
        "Group of friends in apartment/coffee shop",
        "Will they won't they energy",
        "Catchphrases and repeated bits",
        "Physical comedy and slapstick",
        "Everyone lives unrealistically well",
      ],
      tone: "Warm, classic sitcom energy, ensemble comedy",
      cameraStyle: "Multi-camera, bright, warm Central Perk tones",
      exampleScene:
        'Dog on the couch with the energy of "we were on a break" — completely unearned confidence',
    },
  };

  if (ids.length === 0) {
    return `General comedy TV show style. Funny, engaging, entertaining.`;
  }

  const showDetails = ids
    .map((id) => SHOW_STYLES[id])
    .filter(Boolean);

  if (showDetails.length === 1) {
    const show = showDetails[0];
    return `
SHOW STYLE: ${show.name}
TONE: ${show.tone}
CAMERA STYLE: ${show.cameraStyle}

SPECIFIC TECHNIQUES TO USE:
${show.techniques.map((t, i) => `${i + 1}. ${t}`).join("\n")}

EXAMPLE SCENE FOR REFERENCE:
${show.exampleScene}

Every scene in this trailer MUST feel like it came from ${show.name}. Use the specific techniques above.`;
  }

  return `
BLENDED SHOW STYLE: ${showDetails.map((s) => s.name).join(" + ")}

Blend these styles together cohesively.
Take the strongest 1-2 techniques from each show:

${showDetails
  .map(
    (show) => `
FROM ${show.name}:
- Tone: ${show.tone}
- Camera: ${show.cameraStyle}
- Best techniques: ${show.techniques.slice(0, 2).join("; ")}
`
  )
  .join("\n")}

Make the blend feel intentional, not random.
Each scene can lean into a different show's style but the overall trailer should feel cohesive.`;
}

export function getArtStyleVideoSuffix(artStyle: string): string {
  if (artStyle === "liveAction") {
    return [
      "photorealistic",
      "cinematic film quality",
      "shallow depth of field",
      "golden hour lighting",
      "shot on RED camera",
      "Marley and Me visual style",
      "National Geographic quality",
      "NOT cartoon NOT animated",
    ].join(", ");
  }

  if (artStyle === "cinematicCG") {
    return [
      "Pixar 3D animation style",
      "Disney CGI",
      "Zootopia visual quality",
      "large expressive eyes",
      "vibrant saturated colors",
      "smooth 3D rendered fur",
      "warm studio lighting",
      "NOT photorealistic NOT photo",
    ].join(", ");
  }

  return "cinematic, high quality";
}

function getFallbackScript(input: TrailerInput): TrailerScript {
  const name = input.dogName || "The Dog";
  const moodCycle: ("funny" | "dramatic" | "heartwarming")[] = [
    "funny",
    "dramatic",
    "heartwarming",
  ];
  return {
    showTitle: `${name}: A Very Good Show`,
    tagline: "Coming this fall.",
    openingSlate: "This fall...",
    scenes: [1, 2, 3].map((n) => ({
      sceneNumber: n,
      episodeTitle: `Season 1, Episode ${n}: The One Where It Happened`,
      title: `Scene ${n}`,
      description: `${name} in a memorable moment.`,
      visualPrompt: `${name} the dog, ${moodCycle[n - 1]} moment, cinematic, high quality`,
      comedyTechnique: "classic sitcom",
      duration: 5,
      mood: moodCycle[n - 1],
      dogAction: "being adorable",
      setting: "home",
    })),
    totalDuration: 30,
    endSlate: `${name}. Coming soon.`,
  };
}

/** Validate script for personality, dog name, and structure. */
export function validateScript(
  script: TrailerScript,
  input: TrailerInput
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const scriptText = JSON.stringify(script).toLowerCase();
  const dogNameLower = input.dogName.trim().toLowerCase();

  if (!script.scenes || script.scenes.length < 3) {
    issues.push("Not enough scenes (need at least 3)");
  }

  if (dogNameLower && !scriptText.includes(dogNameLower)) {
    issues.push("Dog name not mentioned in script");
  }

  input.selectedObsessions.forEach((obs) => {
    const term = (obs || "").trim().toLowerCase();
    if (!term) return;
    const firstWord = term.split(/\s+/)[0];
    if (firstWord && !scriptText.includes(firstWord)) {
      issues.push(`Missing obsession reference: ${obs}`);
    }
  });

  return { valid: issues.length === 0, issues };
}

function parseTrailerScriptResponse(text: string): TrailerScript | null {
  try {
    const clean = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(clean) as TrailerScript;
  } catch {
    return null;
  }
}

export async function generateTrailerScript(
  input: TrailerInput
): Promise<TrailerScript> {
  const artStyleDescription =
    input.artStyle === "liveAction"
      ? `LIVE ACTION / PHOTOREALISTIC: Cinematic film style like Marley & Me, Air Bud. Real looking dog, real environments. Visual prompts should be photorealistic and cinematic.`
      : `3D CINEMATIC ANIMATION / PIXAR STYLE: Animated like Zootopia, UP, Bolt. Cartoon dog, vibrant colors, large expressive eyes. Visual prompts should describe 3D animated CGI scenes.`;

  const comedyStyleDescription = buildComedyStyleDescription(input.selectedShows);
  const formulaKey = getPrimaryShowFormulaKey(input.selectedShows);
  const showFormula = SHOW_FORMULAS[formulaKey] ?? SHOW_FORMULAS.theOffice;

  const personalityBlock = [
    input.petPersonality,
    input.selectedTraits.length
      ? `Traits: ${input.selectedTraits.join(", ")}`
      : "",
    input.selectedObsessions.length
      ? `Obsessions: ${input.selectedObsessions.join(", ")}`
      : "",
    input.customDetail?.trim() || "",
  ]
    .filter(Boolean)
    .join("\n");

  const formulaBlock = `
You are writing for ${showFormula.name}.

REQUIRED EPISODE STRUCTURE — FOLLOW EXACTLY:
${showFormula.structureFormula.map((step) => step).join("\n")}

REQUIRED ELEMENTS — ALL MUST APPEAR:
${showFormula.requiredElements.map((el) => `✓ ${el}`).join("\n")}

FORBIDDEN — NEVER USE:
${showFormula.forbiddenElements.map((el) => `✗ ${el}`).join("\n")}

TONE GUIDE:
${showFormula.toneGuide}

EXAMPLE PREMISE FOR REFERENCE:
${showFormula.exampleEpisodePremise.replace(/{dogName}/g, input.dogName)}
`;

  const qualityChecklist = `
QUALITY CHECKLIST — verify before returning:
✓ Cold open has clear setup/punchline
✓ Main conflict ties to dog's personality
✓ Dog has clear goal they pursue
✓ Escalation makes things worse before better
✓ Ends warm or triumphant
✓ Would make dog's owner say "that's SO them"
✓ Appropriate for all ages
✓ Follows ${showFormula.name} structure exactly
`;

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const buildUserMessage = (validationFix?: string): string => {
    const fixBlock = validationFix
      ? `\n\nVALIDATION FAILED. Fix these issues before returning:\n${validationFix}\n\nReturn ONLY valid JSON with the fixes applied.\n`
      : "";
    return `You are writing a 30-second TRAILER (3 scenes) for a dog's TV show.

═══════════════════════════════
DOG PROFILE
═══════════════════════════════
Name: ${input.dogName}
${personalityBlock || "Personality: friendly, lovable dog."}

═══════════════════════════════
ART STYLE
═══════════════════════════════
${artStyleDescription}

═══════════════════════════════
COMEDY STYLE
═══════════════════════════════
${comedyStyleDescription}
${formulaBlock}
${qualityChecklist}

YOUR JOB: Write a 30-second trailer with exactly 3 scenes. Each scene MUST use the comedy style's techniques and tie to this dog's personality/obsessions. Visual prompts MUST match the art style (photorealistic for liveAction, 3D animated for cinematicCG). Mix moods: one funny, one dramatic, one heartwarming.
${fixBlock}

Return ONLY valid JSON, no markdown, no backticks:
{
  "showTitle": "${input.dogName}: [funny subtitle that fits the comedy style]",
  "tagline": "[max 6 words]",
  "openingSlate": "[text at trailer start]",
  "scenes": [
    { "sceneNumber": 1, "episodeTitle": "[e.g. Season 1, Episode 3: The Incident]", "title": "[scene title]", "description": "[2-3 sentences, specific to this dog]", "visualPrompt": "[Detailed video prompt for ${input.dogName}, match art style]", "comedyTechnique": "[e.g. talking head confessional]", "duration": 5, "mood": "funny", "dogAction": "[specific action]", "setting": "[location]" },
    { "sceneNumber": 2, "episodeTitle": "", "title": "", "description": "", "visualPrompt": "", "comedyTechnique": "", "duration": 5, "mood": "dramatic", "dogAction": "", "setting": "" },
    { "sceneNumber": 3, "episodeTitle": "", "title": "", "description": "", "visualPrompt": "", "comedyTechnique": "", "duration": 5, "mood": "heartwarming", "dogAction": "", "setting": "" }
  ],
  "totalDuration": 30,
  "endSlate": "[final text card]"
}`;
  };

  let userContent = buildUserMessage();
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const script = parseTrailerScriptResponse(text);

    if (!script) {
      if (attempt === maxAttempts) return getFallbackScript(input);
      continue;
    }

    const validation = validateScript(script, input);
    if (validation.valid) return script;

    if (attempt === maxAttempts) {
      console.warn("Script validation failed after retry:", validation.issues);
      return script;
    }
    userContent = buildUserMessage(
      validation.issues.map((i) => `- ${i}`).join("\n")
    );
  }

  return getFallbackScript(input);
}
