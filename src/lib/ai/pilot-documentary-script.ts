/**
 * Hardcoded 90-second pilot: "The Ball. A Documentary."
 * Life with Waffles — Season 1, Episode 1
 * 10 scenes × 2 clips (wide + close-up) = 20 Hailuo clips, 5s each = 100s footage.
 * Continuous narration over cuts. No looping.
 */

export const PILOT_EPISODE_ID = "cmmjsnak3000b13vvxqbx9m2z";

/** Prefix EVERY Hailuo scene prompt for Dug Days / Pixar style. */
export const HAILUO_PILOT_PREFIX =
  "Pixar 3D animated, Dug Days Disney+ style, soft volumetric fur, large expressive eyes, warm cinematic lighting, lush green grass, vibrant Pixar color palette, ";

export type PilotSpeakerRole = "narrator" | "dog_main" | "dog_large" | "dog_small" | "dog_husky";

export type PilotScene = {
  sceneNumber: number;
  type: "action" | "confessional";
  setting: string;
  action: string;
  /** Clip A (wide) and Clip B (close-up) prompts — exact text to append after HAILUO_PILOT_PREFIX */
  clipPrompts: [string, string];
  narratorLine: string;
  speakerRole: PilotSpeakerRole;
};

export const PILOT_SCRIPT: PilotScene[] = [
  {
    sceneNumber: 1,
    type: "action",
    setting: "Dog park, 9:14am, perfect Tuesday morning",
    action:
      "Waffles trots confidently onto grass, ball in mouth, tail up high, surveying the park like she owns it",
    clipPrompts: [
      "Wide shot — Pixar animated curly brown and cream dog trotting confidently across bright green park grass, yellow tennis ball in mouth, tail wagging high, sunny morning, Dug Days style",
      "Close-up — Pixar animated dog face, huge proud golden eyes, ball in mouth, slightly smug expression, tongue visible around ball",
    ],
    narratorLine:
      "Every morning, Waffles arrives at the park with one goal. One purpose. One ball. She has had this ball for fourteen months. She has never once shared it.",
    speakerRole: "narrator",
  },
  {
    sceneNumber: 2,
    type: "confessional",
    setting: "Confessional — Waffles addresses camera directly",
    action:
      "Waffles sits very still, stares directly into camera, extremely serious expression, slight head tilt",
    clipPrompts: [
      "Medium shot — Pixar animated curly dog sitting facing camera, serious earnest expression, slight head tilt, park background softly blurred, Dug Days confessional style",
      "Extreme close-up — Pixar dog face, giant expressive eyes looking directly at viewer, one eyebrow slightly raised, very serious",
    ],
    narratorLine:
      "The ball and I have an understanding. I throw it — well, someone throws it for me — and then I bring it back. Every time. Because I am a professional. I'm very good at my job.",
    speakerRole: "dog_main",
  },
  {
    sceneNumber: 3,
    type: "action",
    setting: "Far end of park near the bushes",
    action:
      "Waffles emerges from bushes without the ball. Looks left. Looks right. Looks at camera. Complete stillness.",
    clipPrompts: [
      "Wide shot — Pixar animated curly dog emerging from green bushes, no ball, confused scanning left and right, sunny park, Dug Days style",
      "Close-up — Pixar dog face, huge eyes wide with dawning horror, looking around frantically, ball is gone",
    ],
    narratorLine:
      "At 9:31am, the ball enters the bushes. Waffles enters the bushes. Only Waffles comes out. The ball is gone. She will not be okay.",
    speakerRole: "narrator",
  },
  {
    sceneNumber: 4,
    type: "confessional",
    setting: "Confessional — Waffles, visibly composing herself",
    action:
      "Waffles stares at camera, slightly wide-eyed, takes a deep breath, reassembles dignity",
    clipPrompts: [
      "Medium shot — Pixar animated dog facing camera, wide eyes, visibly stressed but trying to appear calm, Dug Days confessional",
      "Close-up — Pixar dog face, one eye twitching slightly, forced calm expression, ears slightly back",
    ],
    narratorLine:
      "I'm not panicking. I don't panic. I'm simply… conducting an investigation. I have several suspects.",
    speakerRole: "dog_main",
  },
  {
    sceneNumber: 5,
    type: "action",
    setting: "Park bench area, multiple dogs present",
    action:
      "Waffles marches up to Bruno (large golden Lab), sniffs him very aggressively and officially. Bruno looks completely bored and unbothered.",
    clipPrompts: [
      "Wide shot — Pixar animated small curly brown dog confronting large golden Labrador, small dog very serious and official, large dog looks completely bored, sunny park bench area, Dug Days style",
      "Close-up — Pixar golden Labrador face, giant dopey eyes, completely unbothered expression, slight eye roll energy",
    ],
    narratorLine:
      "Waffles begins her investigation with the most likely suspect — Bruno, a four-year-old Labrador with a known history of ball theft and zero remorse. Bruno denies everything. Bruno always denies everything.",
    speakerRole: "narrator",
  },
  {
    sceneNumber: 6,
    type: "confessional",
    setting: "Confessional — Bruno the Lab stares at camera",
    action: "Large golden Lab sits facing camera, blinks slowly, completely deadpan",
    clipPrompts: [
      "Medium shot — Pixar animated large golden Labrador sitting facing camera, huge dopey eyes, completely blank expression, slow blink, Dug Days confessional style",
      "Extreme close-up — Pixar Lab face, one slow deliberate blink, the face of a dog with nothing to hide and no interest in this conversation",
    ],
    narratorLine:
      "I don't even like balls. I'm more of a stick guy. But I'm not gonna say I didn't see anything.",
    speakerRole: "dog_large",
  },
  {
    sceneNumber: 7,
    type: "action",
    setting: "Near the park water fountain",
    action:
      "Waffles sniffs tiny Dachshund (Pretzel) very officially. Pretzel immediately spins in a circle 3 times for no reason.",
    clipPrompts: [
      "Wide shot — Pixar animated small curly dog sniffing tiny Dachshund very seriously, Dachshund mid-spin for absolutely no reason, park water fountain background, Dug Days style",
      "Close-up — Pixar tiny Dachshund face, enormous excited eyes, vibrating with energy, cannot focus",
    ],
    narratorLine:
      "Pretzel, two years old, has been at this park for eleven minutes. He saw nothing. He will tell you this immediately and at great length.",
    speakerRole: "narrator",
  },
  {
    sceneNumber: 8,
    type: "confessional",
    setting: "Confessional — Pretzel the Dachshund, extremely energetic",
    action: "Tiny Dachshund faces camera, can barely sit still, eyes darting everywhere",
    clipPrompts: [
      "Medium shot — Pixar animated tiny Dachshund facing camera, vibrating with excitement, enormous eyes darting around, barely containable energy, Dug Days style",
      "Extreme close-up — Pixar Dachshund face, eyes wide as dinner plates, pure chaotic energy",
    ],
    narratorLine:
      "I just got here!! I don't even — there was a BUTTERFLY and then I — was there a ball?? I love balls! Do YOU have a ball??",
    speakerRole: "dog_small",
  },
  {
    sceneNumber: 9,
    type: "action",
    setting: "Far corner of park, Husky alone",
    action:
      "Dramatic Husky sits alone howling at nothing. Waffles approaches carefully. Husky stops. Stares at Waffles. Stares at bushes. Howls again.",
    clipPrompts: [
      "Wide shot — Pixar animated dramatic Husky sitting alone in corner of park howling at sky, small curly dog approaching cautiously, late afternoon golden light, Dug Days style",
      "Close-up — Pixar Husky face, piercing blue eyes, intense thousand-yard stare, knows something",
    ],
    narratorLine:
      "The Husky — no one knows his name — has been howling since 8am. Witnesses say he was here before the ball. He knows something.",
    speakerRole: "narrator",
  },
  {
    sceneNumber: 10,
    type: "confessional",
    setting: "Confessional — Waffles, exhausted, grass on face",
    action:
      "Waffles sits facing camera, grass stuck to her face, looks tired but dignified",
    clipPrompts: [
      "Medium shot — Pixar animated curly dog facing camera, exhausted expression, small piece of grass stuck to face, trying to maintain dignity, Dug Days style",
      "Extreme close-up — Pixar dog face, tired but resolute eyes, grass on nose, the face of someone who has been through something",
    ],
    narratorLine:
      "The investigation is ongoing. Two witnesses were useless. One is a person of interest. My owner keeps saying it's just a ball. She does not understand the gravity of the situation. I'm going back into the bushes.",
    speakerRole: "dog_main",
  },
];

/** End card — narration only, no video clip. */
export const PILOT_END_CARD = {
  narratorLine:
    "The ball was later found under a stroller. Waffles has not apologized to Bruno.",
  speakerRole: "narrator" as PilotSpeakerRole,
};

export const PILOT_TITLE = "The Ball. A Documentary.";
export const PILOT_SHOW_TITLE = "Life with Waffles";
export const PILOT_SYNOPSIS =
  "When Waffles loses her favorite ball at the park, she launches a full investigation. No stone unturned. No dog unquestioned.";
